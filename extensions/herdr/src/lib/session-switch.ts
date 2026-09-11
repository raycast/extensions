import { HerdrError } from "./herdr";
import { resolveSession, setSelectedSession } from "./session-selection";
import {
  focusExistingHerdrClient,
  launchHerdrInTerminal,
  locateTerminalPaneClients,
  type LocatedClient,
} from "./terminal";

export interface SwitchResult {
  /** The target's existing Client was revealed, or a new one was attached. */
  outcome: "revealed" | "attached";
  /** The Session that was selected before the switch. */
  previous: string;
  detached: number;
  /** Why the new Client was attached alongside instead of replacing one. */
  skipped?: string;
}

export type Kill = (pid: number, signal: NodeJS.Signals) => void;

interface SwitchOptions {
  kill?: Kill;
  /** How long to wait for the new Client to become discoverable. */
  confirmTimeoutMs?: number;
  confirmPollMs?: number;
}

const CONFIRM_TIMEOUT_MS = 6_000;
const CONFIRM_POLL_MS = 250;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The pids of the Clients of `session` that own a Terminal Pane right now. */
async function terminalPaneClientPids(session: string): Promise<Set<string>> {
  const located = await locateTerminalPaneClients(session);
  return new Set(located.status === "found" ? located.clients.map((client) => client.pid) : []);
}

/**
 * Waits until a Client of `session` that `isReplacement` accepts owns a Terminal
 * Pane. A spawn only proves the Terminal Application ran the command: Herdr can
 * still exit afterwards, on a protocol mismatch or a refused nested launch, so
 * nothing is detached until the Client is actually there.
 *
 * A lookup that fails is read two ways. With Clients at stake (`strict`), the
 * terminal listed its panes a moment ago, so the failure is transient and means
 * "not yet"; at the deadline the switch fails and signals nothing. With nothing
 * to detach, a terminal that cannot list its panes cannot verify anything, and
 * the selection is allowed to proceed.
 */
async function confirmClientAttached(
  session: string,
  isReplacement: (client: LocatedClient) => boolean,
  strict: boolean,
  timeoutMs: number,
  pollMs: number,
): Promise<"attached" | "unverifiable" | "missing"> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const located = await locateTerminalPaneClients(session);
    if (located.status === "found" && located.clients.some(isReplacement)) return "attached";
    if (located.status === "unavailable" && !strict) return "unverifiable";
    if (Date.now() >= deadline) return "missing";
    await delay(pollMs);
  }
}

/**
 * How the switch recognizes the Client its launch created. `alreadyOpen` is
 * recorded only when Clients are at stake; without it, any Client of the target
 * shows the Session is on screen and nothing will be signaled on the strength
 * of it. Otherwise WezTerm reports the pane it spawned, so the Client must sit
 * in that pane: one that appeared elsewhere, or was open before, proves nothing
 * about this launch. Without a pane id, a Client that was not open before the
 * launch counts.
 */
function replacementTest(
  spawnedPaneId: string | undefined,
  alreadyOpen: Set<string> | undefined,
): (client: LocatedClient) => boolean {
  if (alreadyOpen === undefined) return () => true;
  if (spawnedPaneId !== undefined) return (client) => client.paneId === spawnedPaneId;
  return (client) => !alreadyOpen.has(client.pid);
}

/**
 * Switch: attach the target Session where the previously Selected Session's
 * Clients were, detach those Clients, and select the target. Detach is SIGTERM,
 * the Client's normal quit path; the previous Session's server and everything
 * running in it are untouched.
 *
 * Nothing is selected or detached until a Client that was not already there is
 * discoverable, so a switch that fails leaves the user with the Client and the
 * Session they had.
 * Only the Clients sharing the Terminal Window the replacement went into are
 * detached: one replacement cannot stand in for Clients in other windows, and
 * signaling those would close windows the user still wanted.
 */
export async function switchToSession(target: string, options: SwitchOptions = {}): Promise<SwitchResult> {
  const kill = options.kill ?? ((pid, signal) => process.kill(pid, signal));
  const previous = await resolveSession();

  if ((await focusExistingHerdrClient(target)) === "focused") {
    await setSelectedSession(target);
    return { outcome: "revealed", previous, detached: 0 };
  }

  // Switching to the already Selected Session has nothing to detach: its own
  // Clients are the ones a detach would target.
  const location =
    previous === target
      ? ({ status: "unavailable", reason: `“${target}” is already the selected session` } as const)
      : await locateTerminalPaneClients(previous);

  // Recorded before the launch, and only when Clients are at stake: the switch
  // then knows which Clients of the target it must not mistake for the new one.
  const detachPlanned = location.status === "found";
  const alreadyOpen = detachPlanned ? await terminalPaneClientPids(target) : undefined;

  const launched = await launchHerdrInTerminal(["session", "attach", target], {
    includeSession: false,
    windowId: location.status === "found" ? location.windowId : undefined,
    wezTermListing: location.status === "found" ? location.listing : undefined,
  });

  const confirmation = await confirmClientAttached(
    target,
    replacementTest(launched.wezTermPaneId, alreadyOpen),
    detachPlanned,
    options.confirmTimeoutMs ?? CONFIRM_TIMEOUT_MS,
    options.confirmPollMs ?? CONFIRM_POLL_MS,
  );
  if (confirmation === "missing") {
    throw new HerdrError(
      `Could not confirm a new client of “${target}”`,
      "switch_unconfirmed",
      `The terminal ran the command, but no client of “${target}” appeared where it was launched, so “${previous}” was left as it was.`,
      target,
    );
  }
  await setSelectedSession(target);

  if (location.status === "none") {
    return {
      outcome: "attached",
      previous,
      detached: 0,
      skipped: `no client of “${previous}” is open in a terminal pane`,
    };
  }
  if (location.status === "unavailable")
    return { outcome: "attached", previous, detached: 0, skipped: location.reason };

  // WezTerm names the window the replacement reused; the other terminals cannot
  // target a window at all, so exactly one Client is replaced there.
  const reused = location.windowId;
  const detachable = reused
    ? location.clients.filter((client) => client.windowId === reused)
    : location.clients.slice(0, 1);
  const untouched = location.clients.length - detachable.length;

  let detached = 0;
  let failed = 0;
  for (const client of detachable) {
    try {
      kill(Number(client.pid), "SIGTERM");
      detached += 1;
    } catch {
      // The Client exited on its own, or it is not ours to signal.
      failed += 1;
    }
  }
  if (detached === 0) {
    return {
      outcome: "attached",
      previous,
      detached,
      skipped: `${failed} client${failed === 1 ? "" : "s"} of “${previous}” could not be detached`,
    };
  }
  return {
    outcome: "attached",
    previous,
    detached,
    skipped: untouched > 0 ? `${untouched} client${untouched === 1 ? "" : "s"} left in another window` : undefined,
  };
}
