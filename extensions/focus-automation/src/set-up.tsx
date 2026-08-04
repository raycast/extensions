import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LaunchType,
  List,
  Toast,
  environment,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, type DependencyList } from "react";
import { authorize, disconnect, getAccessTokenSilently } from "./lib/oauth";
import { CalendarSummary, PolledEvent, fetchUpcomingEvents, listCalendars } from "./lib/gcal";
import { clearSelectedCalendarId, getSelectedCalendarId, setSelectedCalendarId } from "./lib/watcher-store";
import { CONFIRM_TIMEOUT_SECONDS, FOCUS_CATEGORIES, MIN_DURATION_MINUTES } from "./lib/constants";
import { LOG_PATH } from "./lib/logger";

async function fireTestPrompt(): Promise<void> {
  try {
    await launchCommand({
      name: "confirm-focus",
      type: LaunchType.UserInitiated,
      arguments: {
        title: "Focus Automation test",
        duration: "120",
        categories: FOCUS_CATEGORIES,
      },
      context: {
        eventId: "onboarding-test",
        logPath: LOG_PATH,
        timeoutSeconds: String(CONFIRM_TIMEOUT_SECONDS),
        startIso: new Date().toISOString(),
      },
    });
  } catch {
    // Static message only: launchCommand's reject is framework-internal, but
    // never echo a raw error into a user surface (matches the body-less catches
    // below; E.0 defense-in-depth).
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't launch the test prompt",
    });
  }
}

function useAsync<T>(
  fn: () => Promise<T>,
  deps: DependencyList,
  onError?: (e: unknown) => void,
): { data: T | undefined; isLoading: boolean; revalidate: () => void } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fn()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) onError?.(e);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [...deps, nonce]);

  return { data, isLoading, revalidate: () => setNonce((n) => n + 1) };
}

// --- Root router: resolve current config, render the first incomplete step (F1) ---

export default function SetUp() {
  const { push } = useNavigation();
  const { data, isLoading, revalidate } = useAsync(async () => {
    // A DEAD grant (refresh rejected: revoked in Google settings, 6 months
    // unused, or a client switch) throws here. Treat it exactly like "never
    // connected": route to S1, whose authorize() wipes the stale tokens and
    // runs a fresh consent. Without this catch the root spins forever on the
    // one screen that could fix the login. (Keep the throw INSIDE
    // getAccessTokenSilently itself — the watcher needs it to tell "re-auth
    // needed" apart from "never onboarded".)
    const token = await getAccessTokenSilently().catch(() => null);
    const calendarId = await getSelectedCalendarId();
    return { token, calendarId };
  }, []);

  if (isLoading || !data) {
    return <Detail isLoading markdown="" />;
  }
  if (!data.token) {
    // onConnected re-resolves this root after authorize() succeeds. Raycast keeps
    // the command open on S1 (it only tears down to root search if we PUSH a view
    // after OAuth), so re-resolving here routes in place to the calendar picker —
    // no push, no relaunch.
    return <ConnectGoogle onConnected={revalidate} />;
  }
  if (!data.calendarId) {
    return (
      <CalendarPicker
        token={data.token}
        onPicked={(cal) => push(<HowItWorks calendarName={cal.summary} token={data.token!} calendarId={cal.id} />)}
      />
    );
  }
  return <StatusScreen />;
}

// --- S1 — Connect Google ---

const S1_MARKDOWN = `# Focus that starts itself

Pick a calendar. When a time block on it begins, Raycast Focus turns on and blocks your distractions, automatically.

Private by design: it reads only event titles and times, runs entirely on your Mac, and never changes your calendar.

**Heads up on the Google screen:** you may see a warning that the app isn't verified. That's expected. Click **Advanced**, then **Continue to Focus Automation**. It can only *read* your calendar.

Press **⏎** to connect.`;

function ConnectGoogle({ onConnected }: { onConnected: () => void }) {
  async function connect() {
    try {
      await authorize();
      // Token saved and the command is still open on this screen. Do NOT push
      // (a push after OAuth gets discarded to root search). Instead re-resolve
      // the root, which now sees the token and routes to the calendar picker.
      onConnected();
    } catch {
      // User canceled/declined consent, or the consent callback failed. No
      // partial state is written; the Connect action stays for a retry (spec
      // edge case: "Consent canceled / declined").
      await showToast({
        style: Toast.Style.Failure,
        title: "Google connection canceled",
      });
    }
  }

  return (
    <Detail
      navigationTitle="Set Up Focus Automation"
      markdown={S1_MARKDOWN}
      actions={
        <ActionPanel>
          <Action title="Connect Google Calendar" icon={Icon.Link} onAction={connect} />
        </ActionPanel>
      }
    />
  );
}

// Finds the next upcoming event that will trigger a Focus session — not all-day,
// duration >= 15 min. fetchUpcomingEvents returns events pre-sorted by startTime
// (Google API orderBy=startTime), so the first qualifying entry is the winner.
function findNextTrigger(events: PolledEvent[]): PolledEvent | null {
  return (
    events.find((e) => e.start !== null && e.durationMin !== null && e.durationMin >= MIN_DURATION_MINUTES) ?? null
  );
}

// Formats a trigger event as "**Title**, today at 14:00" / "tomorrow at..." / "Monday at..."
function formatNextTrigger(event: PolledEvent): string {
  const start = event.start!;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const timeStr = start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (start.toDateString() === now.toDateString()) return `**${event.title}**, today at ${timeStr}`;
  if (start.toDateString() === tomorrow.toDateString()) return `**${event.title}**, tomorrow at ${timeStr}`;
  const dayName = start.toLocaleDateString([], { weekday: "long" });
  return `**${event.title}**, ${dayName} at ${timeStr}`;
}

// --- S2 — Pick your calendar ---

function CalendarPicker({ token, onPicked }: { token: string; onPicked: (cal: CalendarSummary) => void }) {
  const { data, isLoading, revalidate } = useAsync(
    () => listCalendars(token),
    [token],
    () => {
      // Network down or API error during setup. Surface it, don't advance, keep
      // the retry available (spec edge case: "Network down during setup").
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't reach Google. Check your connection and try again.",
      });
    },
  );

  async function reconnect() {
    try {
      await authorize();
      revalidate();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Google connection canceled",
      });
    }
  }

  async function pick(cal: CalendarSummary) {
    await setSelectedCalendarId(cal.id);
    onPicked(cal);
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Which calendar should we watch for focus sessions?"
      searchBarPlaceholder="Filter calendars"
    >
      <List.EmptyView
        title="No calendars found on this Google account."
        description="Wrong account? Reconnect. Otherwise retry."
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action title="Reconnect Google" icon={Icon.Link} onAction={reconnect} />
          </ActionPanel>
        }
      />
      <List.Section title="Works best with the calendar you use for focused work. Any event 15 minutes or longer starts a session.">
        {(data ?? []).map((cal) => (
          <List.Item
            key={cal.id}
            title={cal.summary || "(untitled calendar)"}
            icon={Icon.Calendar}
            actions={
              <ActionPanel>
                <Action title="Watch This Calendar" icon={Icon.Check} onAction={() => pick(cal)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

// --- S3 — How it works + next trigger preview ---

function HowItWorks({ calendarName, token, calendarId }: { calendarName: string; token: string; calendarId: string }) {
  const { push } = useNavigation();
  const { data: nextTrigger, isLoading } = useAsync(
    // Use a 7-day window for the preview (vs the watcher's 14h) so the user
    // sees a real upcoming event even if their next block is days away.
    () => fetchUpcomingEvents(token, calendarId, 7 * 24).then(findNextTrigger),
    [token, calendarId],
    () => {
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't check upcoming events",
      });
    },
  );

  const nextLine =
    !isLoading && nextTrigger !== undefined
      ? nextTrigger
        ? `**Next up:** ${formatNextTrigger(nextTrigger)}`
        : `No upcoming events qualify yet. Add a block 15 minutes or longer to **${calendarName}**.`
      : "";

  const markdown = `# You're live. Watching ${calendarName}

${nextLine ? nextLine + "\n\n" : ""}When a block begins, Focus turns on and blocks distracting apps and sites. You'll get a quick prompt: click **Start**, or it skips itself after ${CONFIRM_TIMEOUT_SECONDS} seconds. (Prefer no prompt? Switch to automatic in Preferences.)

**What triggers a focus session:** any event 15 minutes or longer on this calendar, while your Mac is awake and Raycast is running.

Keep Raycast running so it's always ready: turn on **Launch at login** in **Raycast Settings → General**.`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="You're live"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Done" icon={Icon.Check} onAction={() => push(<StatusScreen />)} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

// --- S4 — Status / settings (also every subsequent run) ---

async function loadStatus(): Promise<{
  connected: boolean;
  calendarName: string;
  triggerMode: "auto" | "confirm";
}> {
  // Dead grant → treat as disconnected (status renders "Reconnect"), never
  // throw: an unhandled throw here would hang the status screen on a spinner.
  const token = await getAccessTokenSilently().catch(() => null);
  const calendarId = await getSelectedCalendarId();

  // Resolve the calendar's display name from its id. No name is stored (the
  // watcher only reads the id — spec: "No new storage"); we look it up live and
  // fall back to the id if the account is offline so the status screen still
  // renders.
  let calendarName = calendarId ?? "your selected calendar";
  if (token && calendarId) {
    try {
      const cals = await listCalendars(token);
      calendarName = cals.find((c) => c.id === calendarId)?.summary ?? calendarName;
    } catch {
      // Offline / API error — keep the id as a readable fallback.
    }
  }

  const prefs = getPreferenceValues<{ triggerMode: "auto" | "confirm" }>();
  return { connected: !!token, calendarName, triggerMode: prefs.triggerMode };
}

function StatusScreen() {
  const { push, pop } = useNavigation();
  const { data, isLoading, revalidate } = useAsync(loadStatus, []);

  const triggerLabel = data?.triggerMode === "auto" ? "Automatic" : "Ask first";
  const markdown = `# Focus Automation ✓

- **Google:** ${data?.connected ? "Connected" : "Not connected"}
- **Watching:** ${data?.calendarName ?? "…"}
- **On block start:** ${triggerLabel} (change in Preferences)`;

  async function reconnect() {
    try {
      await authorize();
      revalidate();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reconnect canceled",
      });
    }
  }

  // Dev-only: clear token + calendar id to simulate a brand-new user. Gated
  // behind isDevelopment so it never ships — a store user uses Raycast's
  // built-in Log Out instead. Reopen Set Up afterward to land on S1.
  async function resetOnboarding() {
    try {
      await disconnect();
      await clearSelectedCalendarId();
      await showToast({
        title: "Onboarding reset (dev)",
        message: "Reopen Set Up Focus Automation to start fresh.",
      });
    } catch {
      // Match the other handlers: never fail silently, even on this dev path.
      await showToast({
        style: Toast.Style.Failure,
        title: "Reset failed",
      });
    }
  }

  async function changeCalendar() {
    // Dead grant → same "connect first" toast as never-connected, not an
    // unhandled throw inside an action.
    const token = await getAccessTokenSilently().catch(() => null);
    if (!token) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connect Google first",
      });
      return;
    }
    push(
      <CalendarPicker
        token={token}
        onPicked={() => {
          revalidate();
          pop();
        }}
      />,
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Focus Automation"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Change Calendar" icon={Icon.Calendar} onAction={changeCalendar} />
          <Action title="Reconnect Google" icon={Icon.Link} onAction={reconnect} />
          <Action title="Test It Now" icon={Icon.Play} onAction={fireTestPrompt} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          {environment.isDevelopment && (
            <Action
              title="Reset Onboarding (Dev)"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={resetOnboarding}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
