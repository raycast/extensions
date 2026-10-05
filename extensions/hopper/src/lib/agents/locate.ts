// PURE: from where an agent runs (its Host) to where to jump (a Location): the app, and the tab and pane in it.
//
// A terminal agent is a process: its parent chain leads to the app that owns its terminal, and its tty is one of
// that app's panes (tabs/model.ts Pane), or in Ghostty (no ttys) the only pane in its folder. An agent in a place
// the tab level lists (a Claude Code session, a herdr pane) names that tab by key. Either way the tab's own source
// selects it; agents never know how. Terminals without panes (any app on the windows fallback) are still located
// to the app.

import type { App, Process } from "../platform/model";
import { appOfProcess, inHerdr } from "../platform/processes";
import type { Tab } from "../tabs/model";
import type { Agent, LocatedAgent, Location } from "./model";

export { appOfProcess, inHerdr };

interface Terminal {
  app: App;
  tty: string;
  cwd: string;
}

/** Tabs already read (Search), or a reader for the tabs of some apps. */
export type TabsOf = Tab[] | ((apps: App[]) => Promise<Tab[]>);

/** The app and tty of an agent that is a terminal process. */
function terminalOf(agent: Agent, byPid: Map<number, Process>, apps: App[]): Terminal | undefined {
  const proc = agent.host.kind === "process" ? byPid.get(agent.host.pid) : undefined;
  const app = proc && appOfProcess(proc.pid, byPid, apps);
  return app && proc ? { app, tty: proc.tty, cwd: proc.cwd } : undefined;
}

/**
 * Locations for `agents`. Given a reader, only the apps whose tabs are needed are read: terminals hosting agents,
 * and apps of places that can't be opened by link.
 */
export async function locate(
  agents: Agent[],
  apps: App[],
  processes: Process[],
  tabsOf: TabsOf,
): Promise<LocatedAgent[]> {
  const byPid = new Map(processes.map((p) => [p.pid, p]));
  const terminals = new Map(agents.map((a) => [a.key, terminalOf(a, byPid, apps)]));
  const tabs = Array.isArray(tabsOf) ? tabsOf : await readNeeded(agents, terminals, apps, tabsOf);
  return agents.map((agent): LocatedAgent => {
    const location = locationOf(agent, terminals.get(agent.key), tabs, apps);
    return location ? { ...agent, location } : agent;
  });
}

async function readNeeded(
  agents: Agent[],
  terminals: Map<string, Terminal | undefined>,
  apps: App[],
  read: (apps: App[]) => Promise<Tab[]>,
): Promise<Tab[]> {
  const needed = new Set<string>();
  for (const agent of agents) {
    const { host } = agent;
    const terminal = terminals.get(agent.key);
    if (terminal) needed.add(terminal.app.bundleId);
    if (host.kind === "place" && !host.url && host.bundleId) needed.add(host.bundleId);
  }
  const hostApps = apps.filter((a) => needed.has(a.bundleId));
  // The reader reports each app's failure itself (tabs/load.ts); anything else fails the whole load, reported there.
  return hostApps.length > 0 ? await read(hostApps) : [];
}

function locationOf(agent: Agent, terminal: Terminal | undefined, tabs: Tab[], apps: App[]): Location | undefined {
  const { host } = agent;
  if (host.kind === "link") {
    const app = apps.find((a) => a.bundleId === host.bundleId);
    return app && { app, label: host.label ?? app.name, url: host.url };
  }
  if (host.kind === "place") {
    const tab = tabs.find((t) => t.key === host.tabKey);
    const app = tab?.app ?? apps.find((a) => a.bundleId === host.bundleId);
    if (!app) return undefined;
    return {
      app,
      label: host.label ? `${host.label} (${app.name})` : app.name,
      ...(tab ? { tab, ...(host.paneId !== undefined ? { paneId: host.paneId } : {}) } : {}),
      ...(host.url ? { url: host.url } : {}),
    };
  }
  if (!terminal) return undefined;
  const match = findPane(tabs, terminal);
  return {
    app: terminal.app,
    label: match ? `${terminal.app.name} › ${match.tab.title}` : terminal.app.name,
    ...(match ? { tab: match.tab, paneId: match.paneId } : {}),
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
