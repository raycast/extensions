import { resolveSession, setSelectedSession } from "./session-selection";
import { focusExistingHerdrClient, launchHerdrInTerminal, locateTerminalPaneClients } from "./terminal";

export interface SwitchResult {
  /** The target's existing Client was revealed, or a new one was attached. */
  outcome: "revealed" | "attached";
  /** The Session that was selected before the switch. */
  previous: string;
  detached: number;
  /** Why the new Client was attached alongside instead of replacing one. */
  skipped?: string;
}

type Kill = (pid: number, signal: NodeJS.Signals) => void;

/**
 * Switch: attach the target Session where the previously Selected Session's
 * Clients were, detach those Clients, and select the target. Detach is SIGTERM,
 * the Client's normal quit path; the previous Session's server and everything
 * running in it are untouched.
 *
 * The selection is written only once the terminal has the new Client, so a
 * failed switch leaves every command pointed where the user last saw it.
 */
export async function switchToSession(
  target: string,
  kill: Kill = (pid, signal) => process.kill(pid, signal),
): Promise<SwitchResult> {
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

  // Spawn before signalling, so a single-tab window is never closed under the new Client.
  await launchHerdrInTerminal(["session", "attach", target], {
    includeSession: false,
    windowId: location.status === "found" ? location.windowId : undefined,
    wezTermListing: location.status === "found" ? location.listing : undefined,
  });
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

  let detached = 0;
  let failed = 0;
  for (const client of location.clients) {
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
  return { outcome: "attached", previous, detached };
}
