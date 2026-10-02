import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getSessions, getStatusLastSeenIso, getTargetConfig, getVacationDays } from "./storage";
import {
  dayKey,
  formatDayLabel,
  formatDelta,
  formatTime,
  formatTimeAt,
  getDaySummary,
  getEstimatedWorkEnd,
  isStatusCommandStale,
  msToClock,
  sameDay,
} from "./utils";
import { Session } from "./types";

export default function Command() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [targetHours, setTargetHours] = useState(8);
  const [vacationDays, setVacationDays] = useState<string[]>([]);
  const [now, setNow] = useState(new Date());
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [showStatusHint, setShowStatusHint] = useState(false);
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const [all, target, vacations, statusLastSeenIso] = await Promise.all([
        getSessions(),
        getTargetConfig(),
        getVacationDays(),
        getStatusLastSeenIso(),
      ]);
      if (!mounted) return;
      setSessions(all);
      setTargetHours(target.targetHours);
      setVacationDays(vacations);
      setShowStatusHint(isStatusCommandStale(statusLastSeenIso, new Date().toISOString()));
    };
    refresh();
    const refreshTimer = setInterval(refresh, 15000);
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => {
      mounted = false;
      clearInterval(refreshTimer);
      clearInterval(tick);
    };
  }, []);

  const isToday = sameDay(referenceDate.toISOString(), now);
  const nowIso = now.toISOString();
  const { slices, totals } = useMemo(
    () => getDaySummary(sessions, referenceDate, nowIso),
    [sessions, referenceDate, nowIso],
  );
  const isVacation = vacationDays.includes(dayKey(referenceDate));
  const targetMs = isVacation ? 0 : targetHours * 3600 * 1000;
  const delta = totals.net - targetMs;
  const activeSlice = slices.find((slice) => !slice.session.end);
  const workEnd = isToday && activeSlice ? getEstimatedWorkEnd(now, totals.net, targetMs, isVacation) : null;

  const goToPreviousDay = () => {
    const previous = new Date(referenceDate);
    previous.setDate(previous.getDate() - 1);
    setReferenceDate(previous);
  };

  const goToNextDay = () => {
    const next = new Date(referenceDate);
    next.setDate(next.getDate() + 1);
    setReferenceDate(next);
  };

  const dayNavigationActions = (
    <ActionPanel.Section>
      <Action title="Previous Day" icon={Icon.ArrowLeft} onAction={goToPreviousDay} />
      <Action title="Next Day" icon={Icon.ArrowRight} onAction={goToNextDay} />
    </ActionPanel.Section>
  );

  const sectionTitle = isToday
    ? `Today - ${msToClock(totals.net)} net`
    : `${formatDayLabel(referenceDate)} - ${msToClock(totals.net)} net`;

  return (
    <List>
      <List.Section
        title={sectionTitle}
        subtitle={`Work ${msToClock(totals.work)} | Breaks ${msToClock(totals.breaks)} | Delta ${formatDelta(delta)}${
          workEnd ? ` | Estimated end: ${formatTimeAt(workEnd)}` : ""
        }${isVacation ? " | Vacation" : ""}${
          showStatusHint ? " | Enable Status in your menu bar for forgotten clock-in/out detection" : ""
        }`}
      >
        {slices.map((slice) => {
          const session = slice.session;
          const startLabel = formatTime(session.start);
          const endLabel = session.end ? formatTime(session.end) : "Now";
          const title = `${startLabel} - ${endLabel}`;
          const subtitle = `${msToClock(slice.net)} net | ${msToClock(slice.breaks)} breaks`;
          const accessories = session.end ? [] : [{ text: "Active" }];
          return (
            <List.Item
              key={session.id}
              icon={Icon.Clock}
              title={title}
              subtitle={subtitle}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy Start" content={session.start} />
                    {session.end ? <Action.CopyToClipboard title="Copy End" content={session.end} /> : null}
                  </ActionPanel.Section>
                  {dayNavigationActions}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.EmptyView
        title="No sessions"
        icon={Icon.Clock}
        actions={<ActionPanel>{dayNavigationActions}</ActionPanel>}
      />
    </List>
  );
}
