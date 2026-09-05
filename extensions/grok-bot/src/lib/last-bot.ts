import { LocalStorage } from "@raycast/api";
import { AgentId, parseAgentId } from "./types";

const LAST_BOT_KEY = "last-bot-id";

export async function getLastBotId(): Promise<AgentId | null> {
  const stored = await LocalStorage.getItem<string>(LAST_BOT_KEY);
  if (stored === undefined) {
    return null;
  }
  const parsed = parseAgentId(stored);
  return parsed.ok ? parsed.value : null;
}

export async function setLastBotId(id: AgentId): Promise<void> {
  await LocalStorage.setItem(LAST_BOT_KEY, id);
}
