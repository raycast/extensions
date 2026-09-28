// PURE: reading every agent source, merging agents seen by two sources, locating them, and jumping to one.

import type { App, Platform } from "../platform/model";
import { projectOf, type Project } from "../projects/project";
import { selectTab } from "../tabs/load";
import { inHerdr, locate, type TabsOf } from "./locate";
import type { Agent, AgentContext, LocatedAgent } from "./model";
import { AGENT_SOURCES } from "./registry";
import { applySeen, SEEN_KEY, sortAgents, type SeenMap } from "./status";

export interface ListedAgent extends LocatedAgent {
  project?: Project;
}

export interface AgentLoadResult {
  agents: ListedAgent[];
  /** Sources that failed, with the reason. */
  failures: { source: string; message: string }[];
}

export interface LoadOptions {
  /** Tabs already read (Search), or how to read the tabs of the apps hosting agents (tabs/load.ts loadTabs). */
  tabs: TabsOf;
  now: number;
}

/** Every agent, most urgent first (status.ts), located, with its project. */
export async function loadAgents(apps: App[], platform: Platform, options: LoadOptions): Promise<AgentLoadResult> {
  const processes = await platform.processes();
  const context: AgentContext = { platform, apps, processes, now: options.now };
  const failures: AgentLoadResult["failures"] = [];
  const lists = await Promise.all(
    AGENT_SOURCES.map((source) =>
      source.list(context).catch((error: unknown) => {
        failures.push({ source: source.id, message: error instanceof Error ? error.message : String(error) });
        return [] as Agent[];
      }),
    ),
  );
  const byPid = new Map(processes.map((p) => [p.pid, p]));
  const merged = mergeAgents(lists.flat(), (pid) => inHerdr(pid, byPid));

  const seen = await platform.loadJson<SeenMap>(SEEN_KEY, {});
  const applied = applySeen(merged, seen, options.now);
  await platform.saveJson(SEEN_KEY, applied.seen);

  const located = await locate(applied.agents, apps, processes, options.tabs);
  const cwds = [...new Set(located.flatMap((a) => (a.cwd ? [a.cwd] : [])))];
  const repos = new Map(cwds.map((cwd, i) => [cwd, i]));
  const found = cwds.length > 0 ? await platform.gitRepos(cwds) : [];
  const agents = located.map((agent): ListedAgent => {
    const project = agent.cwd ? projectOf(found[repos.get(agent.cwd)!]) : undefined;
    return project ? { ...agent, project } : agent;
  });
  return { agents: sortAgents(agents), failures };
}

/**
 * One agent per session. herdr reports the agents in its panes, some also known to their own source (a Claude
 * Code session in a herdr pane): the source's agent is kept, with herdr's pane as its host, since the process's
 * terminal is herdr's and not an app's. Agent CLIs found by process name inside herdr are dropped: herdr lists
 * them itself, with a status; so are those another source already describes.
 */
export function mergeAgents(agents: Agent[], runsInHerdr: (pid: number) => boolean): Agent[] {
  const herdr = agents.filter((a) => a.source === "herdr");
  const herdrBySession = new Map(herdr.flatMap((a) => (a.sessionIds ?? []).map((id) => [id, a] as const)));
  const absorbed = new Set<string>();
  // A process another source already describes (Codex's thread in that terminal) isn't listed again as a bare CLI.
  const claimedPids = new Set(
    agents.flatMap((a) => (a.source !== "cli" && a.host.kind === "process" ? [a.host.pid] : [])),
  );
  const result = agents.flatMap((agent): Agent[] => {
    if (agent.source === "herdr") return [agent];
    if (agent.source === "cli" && agent.host.kind === "process" && claimedPids.has(agent.host.pid)) return [];
    const pane = agent.sessionIds?.map((id) => herdrBySession.get(id)).find(Boolean);
    if (pane) {
      absorbed.add(pane.key);
      return [{ ...agent, host: pane.host, status: agent.status === "unknown" ? pane.status : agent.status }];
    }
    if (agent.source === "cli" && herdr.length > 0 && agent.host.kind === "process" && runsInHerdr(agent.host.pid)) {
      return [];
    }
    return [agent];
  });
  return result.filter((a) => !absorbed.has(a.key));
}

/**
 * Selects the agent's tab and pane with the tab's own source, or opens its link. Returns the app to bring to the
 * front (the caller activates it; ADR-004 / ADR-009 decide when). Marks the agent seen.
 */
export async function jumpToAgent(agent: LocatedAgent, platform: Platform, now: number): Promise<App> {
  const location = agent.location;
  if (!location) throw new Error(`Can't tell where this ${agent.product} runs`);
  if (location.tab) await selectTab(location.tab, platform, location.paneId);
  else if (location.url) await platform.openUrl(location.url, location.app.path);
  const seen = await platform.loadJson<SeenMap>(SEEN_KEY, {});
  await platform.saveJson(SEEN_KEY, { ...seen, [agent.key]: now });
  return location.app;
}
