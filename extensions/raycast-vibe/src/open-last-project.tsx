import { LocalStorage, showHUD } from "@raycast/api";
import { existsSync } from "node:fs";
import { agents } from "./agents";
import {
  RECENT_FOLDERS_KEY,
  LAST_AGENTS_KEY,
  getPaths,
  launchAgent,
} from "./vibe";

export default async function OpenLastProject(): Promise<void> {
  const paths = await getPaths(RECENT_FOLDERS_KEY, 1);
  const folder = paths[0];
  if (!folder) {
    await showHUD("No recent Vibe project.");
    return;
  }
  if (!existsSync(folder)) {
    await showHUD("Last Vibe project no longer exists on disk.");
    return;
  }

  const raw = await LocalStorage.getItem<string>(LAST_AGENTS_KEY);
  let lastAgentId: string | undefined;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, string>;
        lastAgentId = record[folder];
      }
    } catch {
      // ignore corrupt storage
    }
  }

  const available = agents();
  const preferred = lastAgentId
    ? available.find((a) => a.id === lastAgentId)
    : undefined;
  const fallback = available.find((a) => a.id === "terminal");
  const agent = preferred ?? fallback;

  if (!agent) {
    await showHUD("No agent available to launch.");
    return;
  }

  await launchAgent(folder, agent);
}
