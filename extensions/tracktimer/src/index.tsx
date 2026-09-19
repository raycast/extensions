import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { type ActiveTimer, ApiError, type TimeEntry } from "./api";
import { displayColor, duration, recentEntries } from "./model";
import { session } from "./session";
import TimerForm from "./timer-form";

export default function Command() {
  const [connection] = useState(session);
  const [initial] = useState(() => ({
    timer: connection.cached.timer(),
    history: connection.cached.entries(),
  }));
  const [timer, setTimer] = useState<ActiveTimer | null>(initial.timer ?? null);
  const [entries, setEntries] = useState<TimeEntry[]>(initial.history?.entries ?? []);
  const [cursor, setCursor] = useState<string | null>(initial.history?.nextCursor ?? null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [elapsed, setElapsed] = useState(initial.timer?.elapsedSeconds ?? 0);
  const [optimistic, setOptimistic] = useState<{ timer: TimeEntry | null; startedAt: number }>();
  const [mutating, setMutating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const busy = useRef(false);
  const refreshVersion = useRef(0);
  const refresh = useCallback(
    async (afterMutation = false, force = false) => {
      if (busy.current && !afterMutation) return;
      const version = ++refreshVersion.current;
      setLoading(true);
      try {
        const savedPending = Boolean(await connection.pending());
        if (version !== refreshVersion.current) return;
        setPending(savedPending);
        const [active, history] = await Promise.all([
          connection.api.getTimer(force),
          connection.api.getEntries(undefined, force),
        ]);
        if (version !== refreshVersion.current) return;
        const latestPending = Boolean(await connection.pending());
        if (version !== refreshVersion.current) return;
        setPending(latestPending);
        setTimer(active);
        setElapsed(active?.elapsedSeconds ?? 0);
        setEntries(history.entries);
        setCursor(history.nextCursor);
        setError(undefined);
      } catch (e) {
        if (
          version === refreshVersion.current &&
          e instanceof ApiError &&
          (e.status === 401 || e.status === 403)
        ) {
          setTimer(null);
          setEntries([]);
          setCursor(null);
        }
        if (version === refreshVersion.current)
          setError(e instanceof Error ? e.message : "Unable to load timers.");
      } finally {
        if (version === refreshVersion.current) setLoading(false);
      }
    },
    [connection],
  );
  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (!busy.current) void refresh();
    }, 60_000);
    return () => clearInterval(id);
  }, [refresh]);
  useEffect(() => {
    if (!timer && !optimistic?.timer) return;
    const id = setInterval(() => {
      setElapsed((value) => value + 1);
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [timer, optimistic]);
  async function mutate(
    path?: string,
    body?: { projectId: string; billable: boolean; note?: string },
    recent?: TimeEntry,
  ) {
    if (busy.current) return;
    busy.current = true;
    ++refreshVersion.current;
    setMutating(true);
    setActionError(undefined);
    setError(undefined);
    setNow(Date.now());
    if (path) {
      setPending(false);
      setSearchText("");
      setSelectedItemId("current-timer");
    }
    if (recent) setOptimistic({ timer: recent, startedAt: Date.now() });
    else if (path?.endsWith("/stop")) setOptimistic({ timer: null, startedAt: Date.now() });
    try {
      const result = await connection.execute(path, body);
      setTimer(result.timer);
      setElapsed(result.timer?.elapsedSeconds ?? 0);
      setPending(false);
      setOptimistic(undefined);
      await showToast({ style: Toast.Style.Success, title: "Timer updated" });
    } catch (e) {
      setOptimistic(undefined);
      setPending(Boolean(await connection.pending()));
      setActionError(e instanceof Error ? e.message : "Try again.");
      await showToast({
        style: Toast.Style.Failure,
        title: "Timer action failed",
        message: e instanceof Error ? e.message : "Try again.",
      });
    } finally {
      setOptimistic(undefined);
      setMutating(false);
      busy.current = false;
      void refresh(false, true);
    }
  }
  const visibleTimer = optimistic ? optimistic.timer : timer;
  const blockedAction = mutating ? (
    <Action
      title="Timer Action Is Still Saving"
      icon={Icon.Clock}
      onAction={() =>
        showToast({
          style: Toast.Style.Animated,
          title: "Saving timer action",
          message: "Wait for this action to finish before starting another timer.",
        })
      }
    />
  ) : null;
  const visibleElapsed = optimistic
    ? Math.max(0, Math.floor((now - optimistic.startedAt) / 1000))
    : elapsed;
  const common = (
    <>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => refresh(false, true)}
      />
      <Action.OpenInBrowser title="Open TrackTimer" url={`${connection.baseUrl}/app`} />
      <Action title="Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </>
  );
  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      isLoading={loading || mutating}
      searchBarPlaceholder="Search recent timers, projects, or clients…"
    >
      {pending && (
        <List.Section title="Action needs attention">
          <List.Item
            title="Retry pending timer action"
            subtitle={actionError ?? "Retry the previous action, or choose a timer to replace it"}
            icon={Icon.ExclamationMark}
            actions={
              <ActionPanel>
                {blockedAction ?? (
                  <Action title="Retry Pending Timer Action" onAction={() => mutate()} />
                )}
                {common}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {actionError && !pending && (
        <List.Item
          title="Timer action failed"
          subtitle={actionError}
          icon={Icon.ExclamationMark}
          actions={<ActionPanel>{common}</ActionPanel>}
        />
      )}
      {error && (
        <List.Item
          title="Could not refresh TrackTimer"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={<ActionPanel>{common}</ActionPanel>}
        />
      )}
      {visibleTimer && (
        <List.Section title="Running">
          <List.Item
            id="current-timer"
            title={visibleTimer.note || visibleTimer.projectName}
            subtitle={`${visibleTimer.clientName} · ${visibleTimer.projectName}`}
            icon={{ source: Icon.CircleFilled, tintColor: displayColor(visibleTimer.color) }}
            accessories={[
              { text: `${duration(visibleElapsed)} ${visibleElapsed % 60}s` },
              ...(optimistic ? [{ text: "Saving…" }] : []),
            ]}
            actions={
              <ActionPanel>
                {blockedAction ?? (
                  <Action
                    title="Stop Timer"
                    icon={Icon.Stop}
                    onAction={() => mutate(`/timers/${visibleTimer.id}/stop`)}
                  />
                )}
                {common}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {optimistic && !optimistic.timer && (
        <List.Item id="current-timer" title="Timer stopped" subtitle="Saving…" icon={Icon.Stop} />
      )}
      {!mutating && (
        <List.Section title="Actions">
          <List.Item
            title="Create a new timer"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Timer"
                  target={
                    <TimerForm
                      onStarted={() => {
                        const confirmed = connection.cached.timer();
                        if (confirmed !== undefined) {
                          setTimer(confirmed);
                          setElapsed(confirmed?.elapsedSeconds ?? 0);
                        }
                        return refresh(false, true);
                      }}
                    />
                  }
                />
                {common}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Recent timers" subtitle="Starting replaces your current timer">
        {recentEntries(entries).map((entry) => (
          <List.Item
            key={entry.id}
            title={entry.note?.trim() || entry.projectName}
            subtitle={`${entry.clientName} · ${entry.projectName}`}
            keywords={[entry.clientName, entry.projectName, entry.note ?? ""]}
            icon={{ source: Icon.CircleFilled, tintColor: displayColor(entry.color) }}
            accessories={[
              ...(entry.billable ? [{ tag: "Billable" }] : []),
              { text: duration(entry.durationSeconds ?? 0) },
            ]}
            actions={
              <ActionPanel>
                {blockedAction ?? (
                  <Action
                    title="Start Timer Again"
                    icon={Icon.Play}
                    onAction={() =>
                      mutate(
                        "/timers/start",
                        {
                          projectId: entry.projectId,
                          billable: entry.billable,
                          ...(entry.note !== null ? { note: entry.note } : {}),
                        },
                        entry,
                      )
                    }
                  />
                )}
                {common}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {cursor && (
        <List.Item
          title="Load older timers"
          icon={Icon.ChevronDown}
          actions={
            <ActionPanel>
              <Action
                title="Load More"
                onAction={async () => {
                  if (busy.current) return;
                  busy.current = true;
                  setLoading(true);
                  try {
                    const page = await connection.api.getEntries(cursor);
                    setEntries((previous) => [...previous, ...page.entries]);
                    setCursor(page.nextCursor);
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Could not load older timers",
                    });
                  } finally {
                    busy.current = false;
                    setLoading(false);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
