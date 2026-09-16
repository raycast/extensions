import { useEffect, useRef, useState } from "react";
import { MenuBarExtra, Icon, showToast, Toast } from "@raycast/api";
import {
  getForgotThresholds,
  getSessions,
  getStatusState,
  getTargetConfig,
  getVacationDays,
  saveSessions,
  saveStatusLastSeenIso,
  saveStatusState,
} from "./storage";
import {
  closeSessionAt,
  dayKey,
  detectTickGapMs,
  formatDelta,
  formatTimeAt,
  getActiveSession,
  getDaySummary,
  getEstimatedWorkEnd,
  getForgotClockInSuggestion,
  getForgotClockOutSuggestion,
  isSessionPaused,
  isoNow,
  msBetween,
  msToClock,
  newSessionId,
} from "./utils";
import { Session, StatusState } from "./types";

// Gaps below this are ordinary timer jitter (system load, tab throttling), not a real sleep/wake event.
const SLEEP_GAP_TOLERANCE_MS = 60_000;

export default function Command() {
  const [now, setNow] = useState(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [targetHours, setTargetHours] = useState(8);
  const [vacationDays, setVacationDays] = useState<string[]>([]);
  const [thresholds, setThresholds] = useState({ forgotClockOutMs: 15 * 60 * 1000, forgotClockInMs: 30 * 60 * 1000 });
  const [statusState, setStatusState] = useState<StatusState>({});

  const sessionsRef = useRef<Session[]>([]);
  const thresholdsRef = useRef(thresholds);
  const statusStateRef = useRef<StatusState>({});
  const lastTickRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    thresholdsRef.current = thresholds;
  }, [thresholds]);

  const updateStatusState = (patch: Partial<StatusState>) => {
    const next = { ...statusStateRef.current, ...patch };
    statusStateRef.current = next;
    setStatusState(next);
    void saveStatusState(next);
  };

  useEffect(() => {
    let mounted = true;

    const applyGapEvent = (previousTickIso: string, nowIso: string, activeSession: Session | undefined) => {
      const patch: Partial<StatusState> = { awakeSinceIso: nowIso };
      const suggestion = getForgotClockOutSuggestion(
        activeSession,
        previousTickIso,
        nowIso,
        thresholdsRef.current.forgotClockOutMs,
      );
      if (suggestion?.shouldFlag && activeSession) {
        patch.pendingGap = {
          sessionId: activeSession.id,
          suggestedEndIso: suggestion.suggestedEndIso,
          gapMs: detectTickGapMs(previousTickIso, nowIso),
        };
      }
      updateStatusState(patch);
    };

    const initialize = async () => {
      const [persisted, all, target, vacations, forgotThresholds] = await Promise.all([
        getStatusState(),
        getSessions(),
        getTargetConfig(),
        getVacationDays(),
        getForgotThresholds(),
      ]);
      if (!mounted) return;
      const nowIso = isoNow();
      setSessions(all);
      setTargetHours(target.targetHours);
      setVacationDays(vacations);
      setThresholds(forgotThresholds);
      sessionsRef.current = all;
      thresholdsRef.current = forgotThresholds;
      statusStateRef.current = persisted;
      wasActiveRef.current = Boolean(getActiveSession(all));

      const restartGapMs = persisted.lastTickIso ? detectTickGapMs(persisted.lastTickIso, nowIso) : 0;
      if (persisted.lastTickIso && restartGapMs >= SLEEP_GAP_TOLERANCE_MS) {
        applyGapEvent(persisted.lastTickIso, nowIso, getActiveSession(all));
      } else {
        updateStatusState({ awakeSinceIso: persisted.awakeSinceIso ?? nowIso });
      }

      lastTickRef.current = nowIso;
      initializedRef.current = true;
    };

    const refresh = async () => {
      const [all, target, vacations, forgotThresholds] = await Promise.all([
        getSessions(),
        getTargetConfig(),
        getVacationDays(),
        getForgotThresholds(),
      ]);
      if (!mounted) return;
      setSessions(all);
      setTargetHours(target.targetHours);
      setVacationDays(vacations);
      setThresholds(forgotThresholds);
      if (lastTickRef.current) updateStatusState({ lastTickIso: lastTickRef.current });
      await saveStatusLastSeenIso(isoNow());
    };

    initialize().then(refresh);
    const refreshTimer = setInterval(refresh, 15000);
    const tick = setInterval(() => {
      const nowIso = isoNow();
      if (initializedRef.current) {
        const previousTick = lastTickRef.current;
        if (previousTick) {
          const gapMs = detectTickGapMs(previousTick, nowIso);
          if (gapMs >= SLEEP_GAP_TOLERANCE_MS) {
            applyGapEvent(previousTick, nowIso, getActiveSession(sessionsRef.current));
          }
        }
        lastTickRef.current = nowIso;
      }
      setNow(new Date(nowIso));
    }, 1000);
    return () => {
      mounted = false;
      clearInterval(refreshTimer);
      clearInterval(tick);
    };
  }, []);

  // A pending "forgot to clock out" suggestion becomes stale once the session it points at
  // is no longer open (closed here, or manually edited/closed in Adjust Entries).
  useEffect(() => {
    const pendingGap = statusState.pendingGap;
    if (!pendingGap) return;
    const session = sessions.find((s) => s.id === pendingGap.sessionId);
    const stillValid =
      session && !session.end && new Date(session.start).getTime() <= new Date(pendingGap.suggestedEndIso).getTime();
    if (!stillValid) {
      updateStatusState({ pendingGap: undefined });
    }
  }, [sessions, statusState.pendingGap]);

  // The "awake without a session" countdown must restart the moment a session ends (Clock Out,
  // or a manual edit in Adjust Entries) rather than staying pinned to when it started — otherwise
  // a normal full workday reads as one giant "forgot to clock in" gap the instant it ends.
  useEffect(() => {
    const isActive = Boolean(getActiveSession(sessions));
    if (isActive) {
      wasActiveRef.current = true;
    } else if (wasActiveRef.current) {
      wasActiveRef.current = false;
      updateStatusState({ awakeSinceIso: isoNow() });
    }
  }, [sessions]);

  const nowIso = now.toISOString();
  const active = getActiveSession(sessions);
  const status = active ? (isSessionPaused(active) ? "paused" : "working") : "off";
  const { totals } = getDaySummary(sessions, now, nowIso);
  const netMs = totals.net;
  const icon = status === "working" ? Icon.Play : status === "paused" ? Icon.Pause : Icon.Circle;
  const isVacation = vacationDays.includes(dayKey(now));
  const targetMs = isVacation ? 0 : targetHours * 3600 * 1000;
  const workEnd = status === "working" ? getEstimatedWorkEnd(now, netMs, targetMs, isVacation) : null;
  const title =
    status === "working"
      ? msToClock(netMs)
      : status === "paused"
        ? `Paused ${msToClock(netMs)}`
        : isVacation
          ? "Vacation"
          : "Off";
  const delta = netMs - targetMs;

  const pendingGap = statusState.pendingGap;
  const showGapSuggestion = Boolean(pendingGap && statusState.dismissedGapKey !== pendingGap.suggestedEndIso);
  const gapAwayMs = pendingGap?.gapMs ?? 0;

  const awakeSinceIso = statusState.awakeSinceIso ?? nowIso;
  const clockInSuggestion = getForgotClockInSuggestion(active, awakeSinceIso, nowIso, thresholds.forgotClockInMs);
  const showClockInSuggestion = Boolean(
    clockInSuggestion?.shouldFlag && statusState.dismissedAwakeKey !== awakeSinceIso,
  );
  const awakeMs = msBetween(awakeSinceIso, nowIso);

  const confirmForgotClockOut = async () => {
    if (!pendingGap) return;
    const allSessions = await getSessions();
    const target = allSessions.find((s) => s.id === pendingGap.sessionId && !s.end);
    if (!target) {
      updateStatusState({ pendingGap: undefined });
      await showToast(Toast.Style.Failure, "Session already closed");
      return;
    }
    closeSessionAt(target, pendingGap.suggestedEndIso);
    await saveSessions(allSessions);
    setSessions(allSessions);
    updateStatusState({ pendingGap: undefined, dismissedGapKey: undefined });
    await showToast(Toast.Style.Success, "Clocked out retroactively");
  };

  const dismissForgotClockOut = () => {
    if (!pendingGap) return;
    updateStatusState({ dismissedGapKey: pendingGap.suggestedEndIso });
  };

  const confirmForgotClockIn = async () => {
    const allSessions = await getSessions();
    if (getActiveSession(allSessions)) {
      updateStatusState({ dismissedAwakeKey: undefined });
      await showToast(Toast.Style.Failure, "Already clocked in");
      return;
    }
    allSessions.push({ id: newSessionId(), start: isoNow(), pauses: [] });
    await saveSessions(allSessions);
    setSessions(allSessions);
    updateStatusState({ dismissedAwakeKey: undefined });
    await showToast(Toast.Style.Success, "Clocked in");
  };

  const dismissForgotClockIn = () => {
    updateStatusState({ dismissedAwakeKey: awakeSinceIso });
  };

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={`Delta: ${formatDelta(delta)}`}>
      <MenuBarExtra.Item title={`Status: ${status}`} />
      <MenuBarExtra.Item title={`Live: ${title}`} />
      {workEnd ? <MenuBarExtra.Item title={`Estimated work end: ${formatTimeAt(workEnd)}`} /> : null}
      {isVacation ? <MenuBarExtra.Item title="Vacation Day" /> : null}
      <MenuBarExtra.Item title={`Delta: ${formatDelta(delta)}`} />
      {showGapSuggestion ? (
        <MenuBarExtra.Section title="Forgot to clock out?">
          <MenuBarExtra.Item
            title={`⚠️ Probably forgot to clock out (away: ${msToClock(gapAwayMs)})`}
            onAction={confirmForgotClockOut}
          />
          <MenuBarExtra.Item title="Ignore" onAction={dismissForgotClockOut} />
        </MenuBarExtra.Section>
      ) : null}
      {showClockInSuggestion ? (
        <MenuBarExtra.Section title="Forgot to clock in?">
          <MenuBarExtra.Item
            title={`⏰ No active session for ${msToClock(awakeMs)} — clock in now?`}
            onAction={confirmForgotClockIn}
          />
          <MenuBarExtra.Item title="Ignore" onAction={dismissForgotClockIn} />
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra>
  );
}
