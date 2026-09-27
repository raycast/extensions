// PURE: from where an agent runs (its Host) to where to jump (a Location): the app, and the tab and pane in it.
//
// A terminal agent is a process: its parent chain leads to the app that owns its terminal, and its tty is one of
// that app's panes (tabs/model.ts Pane), or in Ghostty (no ttys) the only pane in its folder. An agent inside
// herdr runs in herdr's server, not in an app: herdr focuses the pane itself, and the terminal running a herdr
// client comes forward. Terminals without panes (any app on the windows fallback) are still located to the app.

import type { App, Process } from "../platform/model";
import { appOfProcess, herdrClient, inHerdr } from "../platform/processes";
import type { Tab } from "../tabs/model";
import type { Agent, LocatedAgent, Location } from "./model";

export { appOfProcess, inHerdr };

interface Terminal {
  app: App;
  tty: string;
  cwd: string;
}

/** The app and tty an agent's host runs in, for hosts that are terminal processes (directly or through herdr). */
function terminalOf(agent: Agent, byPid: Map<number, Process>, processes: Process[], apps: App[]) {
  const proc =
    agent.host.kind === "process"
      ? byPid.get(agent.host.pid)
      : agent.host.kind === "herdr"
        ? herdrClient(processes)
        : undefined;
  const app = proc && appOfProcess(proc.pid, byPid, apps);
  return app && proc ? { app, tty: proc.tty, cwd: proc.cwd } : undefined;
}

/**
 * Locations for `agents`. `loadTabs` reads the tabs of the given apps (only terminal apps that host agents are
 * asked for); callers that already have tabs return them.
 */
export async function locate(
  agents: Agent[],
  apps: App[],
  processes: Process[],
  loadTabs: (apps: App[]) => Promise<Tab[]>,
): Promise<LocatedAgent[]> {
  const byPid = new Map(processes.map((p) => [p.pid, p]));
  const terminals = new Map<string, Terminal | undefined>(
    agents.map((a) => [a.key, terminalOf(a, byPid, processes, apps)]),
  );
  const hostApps = [
    ...new Map([...terminals.values()].flatMap((t) => (t ? [[t.app.bundleId, t.app] as const] : []))).values(),
  ];
  const tabs = hostApps.length > 0 ? await loadTabs(hostApps).catch(() => []) : [];

  return agents.map((agent): LocatedAgent => {
    const location = locationOf(agent, terminals.get(agent.key), tabs, apps);
    return location ? { ...agent, location } : agent;
  });
}

function locationOf(agent: Agent, terminal: Terminal | undefined, tabs: Tab[], apps: App[]): Location | undefined {
  const { host } = agent;
  if (host.kind === "link") {
    const app = apps.find((a) => a.bundleId === host.bundleId);
    return app && { app, label: host.label ?? app.name, url: host.url };
  }
  if (!terminal) return undefined;
  const match = findPane(tabs, terminal);
  const place = match ? `${terminal.app.name} › ${match.tab.title}` : terminal.app.name;
  return {
    app: terminal.app,
    label: host.kind === "herdr" ? `${host.label} (${terminal.app.name})` : place,
    ...(match ? { tab: match.tab, paneId: match.paneId } : {}),
    ...(host.kind === "herdr" ? { herdr: { socket: host.socket, paneId: host.paneId } } : {}),
  };
}

/**
 * The pane on the process's tty; else, in terminals that don't report ttys (Ghostty), the one pane of the app
 * in the process's folder, if only one is.
 */
function findPane(tabs: Tab[], { app, tty, cwd }: Terminal): { tab: Tab; paneId: string } | undefined {
  const own = tabs.filter((t) => t.app.bundleId === app.bundleId);
  const panes = own.flatMap((tab) => (tab.panes ?? []).map((pane) => ({ tab, pane })));
  const exact = tty ? panes.find(({ pane }) => pane.tty === tty) : undefined;
  const byFolder = cwd ? panes.filter(({ pane }) => !pane.tty && pane.cwd === cwd) : [];
  const match = exact ?? (byFolder.length === 1 ? byFolder[0] : undefined);
  return match && { tab: match.tab, paneId: match.pane.id };
}
