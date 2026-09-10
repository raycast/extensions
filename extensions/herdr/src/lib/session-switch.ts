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
 * Switch: select the target, then detach the previously Selected Session's
 * Clients in the Terminal Application and attach the target in their Terminal
 * Window. Detach is SIGTERM, the Client's normal quit path; the previous
 * Session's server and everything running in it are untouched.
 */
export async function switchToSession(
  target: string,
  kill: Kill = (pid, signal) => process.kill(pid, signal),
): Promise<SwitchResult> {
  const previous = await resolveSession();
  await setSelectedSession(target);

  if ((await focusExistingHerdrClient(target)) === "focused") return { outcome: "revealed", previous, detached: 0 };

  const location = previous === target ? { status: "none" as const } : await locateTerminalPaneClients(previous);
  // Spawn before signalling, so a single-tab window is never closed under the new Client.
  await launchHerdrInTerminal(["session", "attach", target], {
    includeSession: false,
    windowId: location.status === "found" ? location.windowId : undefined,
  });

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
  for (const client of location.clients) {
    try {
      kill(Number(client.pid), "SIGTERM");
      detached += 1;
    } catch {
      // The client exited on its own in the meantime.
    }
  }
  return { outcome: "attached", previous, detached };
}
