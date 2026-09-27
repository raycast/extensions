// Glue: the agent level on macOS, shared by the Agents list, Next Agent, and the status shown in Search.

import { loadAgents, type AgentLoadResult } from "../agents/load";
import { loadTabs } from "../tabs/load";
import type { Tab } from "../tabs/model";
import { getRecentApps } from "./macos";
import type { App } from "./model";
import { macosPlatform } from "./os";

/** All agents. `tabs`: tabs already read (Search), reused to locate terminal agents. */
export async function loadAllAgents(options: { tabs?: Tab[] } = {}): Promise<AgentLoadResult & { apps: App[] }> {
  const apps = await getRecentApps();
  const result = await loadAgents(apps, macosPlatform, {
    loadTabs: async (hosts) => options.tabs ?? (await loadTabs(hosts, macosPlatform)).tabs,
    now: Date.now(),
  });
  return { ...result, apps };
}
