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
import { authorize, disconnect, getAccessTokenSilently, isAuthError } from "./lib/oauth";
import { CalendarSummary, PolledEvent, fetchUpcomingEvents, listCalendars } from "./lib/gcal";
import { clearSelectedCalendarId, getSelectedCalendarId, setSelectedCalendarId } from "./lib/watcher-store";
import { CONFIRM_TIMEOUT_SECONDS, FOCUS_CATEGORIES, MIN_DURATION_MINUTES } from "./lib/constants";
import { LOG_PATH } from "./lib/logger";

// The one toast copy for a dead grant (revoked at myaccount.google.com,
// password change, security event, long inactivity). Auth-specific on purpose:
// the old network copy ("Couldn't reach Google. Check your connection") sent
// users debugging their wifi when the fix is one Reconnect click (2026-07-16).
const AUTH_REVOKED_TOAST = {
  style: Toast.Style.Failure,
  title: "Google access was revoked or expired",
  message: "Use Reconnect Google to sign in again.",
} as const;

// Phase D.5 — first-run onboarding (spec: specs/phase-d5-first-run-onboarding.md).
//
// A brand-new store user has no way to connect a calendar otherwise: both shipped
// commands are background/no-view, and the only interactive-authorize screen was
// the dev-only spike deleted in E.0. This is the single `view` command that wires
// the existing interactive `authorize()` (oauth.ts) back in for real users.
//
// It touches NONE of the frozen runtime (daemon, confirm-focus, watcher decision
// logic). It only writes config the watcher already reads: the token to the
// Raycast keychain (PKCEClient) and the calendar id to LocalStorage. The watcher
// picks both up on its next tick.
//
// Shape (locked, Decision 6 + D5-1/2/3): connect Google → pick one calendar →
// explainer + login-items reminder → "test it now" (a REAL confirm-focus fire) →
// status/settings. Each state is a self-contained screen; the root routes to the
// first incomplete step so a quit-mid-flow user resumes where they left off (F1).

// Fires the exact same path a real watcher trigger does (focus-watcher.tsx
// fireWinner): same command, same arguments + context shape, our LOG_PATH as the
// sink. The only differences are the synthetic event id and the fixed 2-min
// duration. So "test it now" proves the real trigger end-to-end, not a mock (D5-2).
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

// Minimal async-data hook. Replaces @raycast/utils' usePromise so this command
// (the only JSX-rendering one) doesn't import @raycast/utils@1.18, whose types
// aren't coherent with the much newer @raycast/api that resolves in. Same shape
// we use: { data, isLoading, revalidate }, with an optional error callback.
//
// Contract: `fn` is re-run when any value in `deps` changes (or on revalidate).
// It captures the render-time closure, so it must only read values you pass in
// `deps` — a `fn` that closes over component state NOT in `deps` will read a
// stale value. Current callers pass [] or [token], which is correct.
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

    // Route on token VALIDITY, not mere presence (2026-07-16 dead-grant loop).
    // After a server-side revoke the cached access token reads !isExpired() for
    // up to ~1h, so without this probe the root routes past S1 into screens
    // that can only 401: the CalendarPicker dead-end (token present, calendar
    // id cleared) or a StatusScreen that claims "Connected" on a corpse. One
    // cheap listCalendars round-trip tells the truth; on a dead grant, clear
    // the tokens and land on Connect Google. A non-auth failure (offline)
    // keeps the token — don't force a re-consent over a network blip.
    if (token) {
      try {
        await listCalendars(token);
      } catch (e) {
        if (isAuthError(e)) {
          await disconnect();
          return { token: null, calendarId };
        }
      }
    }
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
        // freshToken is the picker's CURRENT token, not the root-load-time
        // data.token: if the grant died while the picker was open and the user
        // reconnected in place, data.token is the dead one — pushing it into
        // HowItWorks would 401 (and wipe the fresh login) right after a good
        // reconnect (/ce-review 2026-07-16, scope lens).
        onPicked={(cal, freshToken) =>
          push(<HowItWorks calendarName={cal.summary} token={freshToken} calendarId={cal.id} />)
        }
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
      // force: the root only routes here when the login is absent OR dead. A
      // plain authorize() could still short-circuit on a dead-but-not-expired
      // cached token (if the root's probe was skipped by an offline error) and
      // hand it right back — the reconnect no-op loop this fixes.
      await authorize({ force: true });
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

function CalendarPicker({
  token: initialToken,
  onPicked,
}: {
  token: string;
  // The second argument is the picker's CURRENT token — callers advancing to
  // another Google-fetching screen must use it, never their own captured token.
  onPicked: (cal: CalendarSummary, freshToken: string) => void;
}) {
  // The token lives in STATE, seeded from the prop, so reconnect() can thread
  // the freshly-authorized token back into the data source. The old version
  // kept using the prop captured at push: after a successful re-consent,
  // revalidate() re-ran listCalendars with the STALE dead token, so even a
  // good reconnect kept failing until the command was closed and reopened
  // (2026-07-16 facet 5). Changing `token` re-runs useAsync via its deps.
  // Invariant: the seed is read ONCE at mount — every call site must mount a
  // fresh CalendarPicker per token (all current ones do). Re-rendering an
  // already-mounted picker with a different token prop would be ignored.
  const [token, setToken] = useState(initialToken);
  // Distinguishes the auth-dead empty state from network/genuinely-empty, so a
  // revoked grant doesn't render as "No calendars found on this Google
  // account." (misleading — 2026-07-16 facet 2). Set only in the error
  // callback, cleared only after a successful reconnect: both run in event/
  // callback context, so a superseded slow fetch can't clobber the flag (the
  // useAsync `cancelled` guard doesn't cover writes made inside `fn`).
  const [authDead, setAuthDead] = useState(false);
  const { data, isLoading, revalidate } = useAsync(
    () => listCalendars(token),
    [token],
    (e) => {
      if (isAuthError(e)) {
        // Dead grant: the cached token was revoked server-side. Clear it so
        // no other screen keeps trusting it, and point at Reconnect. The
        // catch keeps a keychain-write failure from crashing the view — the
        // toast is already up, and the root probe re-clears on next open.
        setAuthDead(true);
        void disconnect().catch(() => {});
        void showToast(AUTH_REVOKED_TOAST);
        return;
      }
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
      // force: skip the reuse short-circuit and run a fresh consent — on a
      // dead-but-not-expired token a plain authorize() returns the corpse and
      // Reconnect silently does nothing (2026-07-16 facet 1).
      const fresh = await authorize({ force: true });
      setAuthDead(false);
      setToken(fresh); // deps change → the list refetches with the new token
      // Belt-and-suspenders: if Google re-issued the identical still-valid
      // token string, the deps wouldn't change — the nonce bump forces the
      // refetch anyway (a duplicate fetch is harmless, React batches these).
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
    onPicked(cal, token);
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Which calendar should we watch for focus sessions?"
      searchBarPlaceholder="Filter calendars"
    >
      <List.EmptyView
        title={authDead ? "Google access was revoked or expired." : "No calendars found on this Google account."}
        description={authDead ? "Reconnect Google to sign in again." : "Wrong account? Reconnect. Otherwise retry."}
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
  // Mirrors the picker's authDead flag (2026-07-16): without it, a grant that
  // dies mid-flow (rare — consent was seconds ago) kept the "You're live"
  // headline until the user clicked Done and reached StatusScreen, the only
  // screen that told the truth. The toast alone is easy to miss (ideas.md
  // 2026-07-16 nit a).
  const [authDead, setAuthDead] = useState(false);
  const { data: nextTrigger, isLoading } = useAsync(
    // Use a 7-day window for the preview (vs the watcher's 14h) so the user
    // sees a real upcoming event even if their next block is days away.
    () => fetchUpcomingEvents(token, calendarId, 7 * 24).then(findNextTrigger),
    [token, calendarId],
    (e) => {
      if (isAuthError(e)) {
        // Grant died mid-flow (rare — consent was seconds ago). Clear the dead
        // token so Done → StatusScreen honestly shows "Not connected" with a
        // working Reconnect, instead of a phantom "Connected".
        setAuthDead(true);
        void disconnect().catch(() => {});
        void showToast(AUTH_REVOKED_TOAST);
        return;
      }
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

  const markdown = authDead
    ? `# Google access was revoked or expired

Reconnect Google to finish setting up **${calendarName}**.`
    : `# You're live. Watching ${calendarName}

${nextLine ? nextLine + "\n\n" : ""}When a block begins, Focus turns on and blocks distracting apps and sites. You'll get a quick prompt: click **Start**, or it skips itself after ${CONFIRM_TIMEOUT_SECONDS} seconds. (Prefer no prompt? Switch to automatic in Preferences.)

**What triggers a focus session:** any event 15 minutes or longer on this calendar, while your Mac is awake and Raycast is running.

Keep Raycast running so it's always ready: turn on **Launch at login** in **Raycast Settings → General**.`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={authDead ? "Reconnect needed" : "You're live"}
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
  let connected = !!token;
  if (token && calendarId) {
    try {
      const cals = await listCalendars(token);
      calendarName = cals.find((c) => c.id === calendarId)?.summary ?? calendarName;
    } catch (e) {
      if (isAuthError(e)) {
        // Grant died after the root probe (e.g. revoked mid-session, then the
        // user hit Change Calendar or a revalidate). Report the truth — a
        // "Connected" built on token PRESENCE would be the phantom status this
        // fix exists to kill — and clear the corpse so every surface agrees.
        connected = false;
        await disconnect().catch(() => {});
      }
      // Otherwise offline / API error — keep the id as a readable fallback.
    }
  }

  const prefs = getPreferenceValues<{ triggerMode: "auto" | "confirm" }>();
  return { connected, calendarName, triggerMode: prefs.triggerMode };
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
      // force: same reconnect no-op fix as the picker — a dead-but-not-expired
      // token must not short-circuit the consent (2026-07-16 facet 1). No token
      // threading needed here: revalidate() → loadStatus re-reads the keychain.
      await authorize({ force: true });
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
          <Action.OpenInBrowser
            title="Send Feedback"
            icon={Icon.SpeechBubble}
            url="mailto:pierre.marie.mogenet@gmail.com?subject=Focus%20Automation%20feedback"
          />
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
