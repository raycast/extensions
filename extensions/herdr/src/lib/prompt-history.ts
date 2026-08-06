import { LocalStorage } from "@raycast/api";
import type { AgentInfo, PromptHistoryItem } from "./types";

const STORAGE_KEY = "prompt-history-v1";
const MAX_HISTORY = 30;

export async function getPromptHistory(): Promise<PromptHistoryItem[]> {
  const value = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as PromptHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addPromptHistory(agent: AgentInfo, target: string, text: string): Promise<void> {
  const history = await getPromptHistory();
  const item: PromptHistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    target,
    agent: agent.name || agent.display_agent || agent.agent || agent.pane_id,
    kind: agent.agent,
    createdAt: new Date().toISOString(),
  };
  const deduplicated = history.filter((entry) => entry.text !== text || entry.target !== target);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...deduplicated].slice(0, MAX_HISTORY)));
}

export async function clearPromptHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
