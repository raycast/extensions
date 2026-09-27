import {
  getPreferenceValues,
  Icon,
  LaunchType,
  LocalStorage,
  launchCommand,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { type ActiveTimer, ApiError, type DailySummary } from "./api";
import { duration } from "./model";
import { session } from "./session";

function earningsText(summary: DailySummary) {
  return (
    summary.earnings
      .map(({ currency, amount }) =>
        new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount)),
      )
      .join(" · ") || "No earnings"
  );
}

export default function Command() {
  const [connection] = useState(session);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [initial] = useState(() => ({
    timer: connection.cached.timer(),
    summary: connection.cached.summary(timezone),
  }));
  const [timer, setTimer] = useState<ActiveTimer | null>(initial.timer ?? null);
  const [summary, setSummary] = useState<DailySummary | undefined>(initial.summary);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const refreshVersion = useRef(0);
  const { displayMode = "timer" } = getPreferenceValues<Preferences.MenuBar>();
  const refresh = useCallback(
    async (forceSummary = false) => {
      const version = ++refreshVersion.current;
      setLoading(true);
      try {
        const [active, today, operation] = await Promise.all([
          connection.api.getTimer(true),
          connection.getSummary(timezone, forceSummary),
          connection.pending(),
        ]);
        if (version !== refreshVersion.current) return;
        setTimer(active);
        setSummary(today);
        setPending(Boolean(operation));
        setError(undefined);
      } catch (e) {
        if (version !== refreshVersion.current) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setTimer(null);
          setSummary(undefined);
        }
        setError(e instanceof Error ? e.message : "Could not refresh TrackTimer.");
      } finally {
        if (version === refreshVersion.current) setLoading(false);
      }
    },
    [connection, timezone],
  );
  useEffect(() => {
    void LocalStorage.setItem("menu-bar-enabled", true);
    void refresh();
    // While the dropdown is open Raycast keeps this component mounted.
    const interval = setInterval(() => {
      if (!busy.current) void refresh();
    }, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);
  async function stop() {
    if (!timer || busy.current || pending) return;
    busy.current = true;
    setLoading(true);
    try {
      await connection.execute(`/timers/${timer.id}/stop`);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Timer action failed",
        message: e instanceof Error ? e.message : "Try again.",
      });
    } finally {
      await refresh(true);
      busy.current = false;
    }
  }
  const title =
    displayMode === "timer" && timer
      ? duration(timer.elapsedSeconds)
      : displayMode === "earnings" && summary
        ? earningsText(summary)
        : summary
          ? duration(summary.trackedSeconds)
          : error
            ? "Unavailable"
            : "TrackTimer";
  return (
    <MenuBarExtra
      icon={error ? Icon.ExclamationMark : timer ? Icon.Play : Icon.Clock}
      title={title}
      tooltip={error || "TrackTimer · Today in your Mac’s timezone"}
      isLoading={loading}
    >
      {error ? (
        <MenuBarExtra.Item title={error} />
      ) : (
        <>
          <MenuBarExtra.Item
            title={
              timer
                ? `${timer.note?.trim() || timer.projectName} · ${duration(timer.elapsedSeconds)}`
                : "No running timer"
            }
          />
          {timer?.note?.trim() && <MenuBarExtra.Item title={timer.projectName} />}
          {summary && (
            <>
              <MenuBarExtra.Item title={`Today’s time: ${duration(summary.trackedSeconds)}`} />
              <MenuBarExtra.Item title={`Today’s earnings: ${earningsText(summary)}`} />
            </>
          )}
          {timer && !pending && (
            <MenuBarExtra.Item title="Stop Timer" icon={Icon.Stop} onAction={stop} />
          )}
        </>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={pending ? "Resolve Pending Timer Action…" : "Start / Manage Timers…"}
          icon={Icon.Play}
          onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Start New Timer…"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "create-timer", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={() => refresh(true)}
        />
        <MenuBarExtra.Item
          title="Open TrackTimer"
          onAction={() => open(`${connection.baseUrl}/app`)}
        />
        <MenuBarExtra.Item title="Settings…" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
