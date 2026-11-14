import { getPreferenceValues } from "@raycast/api";
import { createApi, Note } from "./api";
import { createToolCaller } from "./mcp";

const preferences = getPreferenceValues<Preferences>();

export const dailyJotTag = preferences.dailyJotTag?.trim() || "daily-jots";

export function isDailyJot(note: Note): boolean {
  return note.tags.includes(dailyJotTag);
}

export const amplenote = createApi(
  createToolCaller(preferences.mcpUrl?.trim() || "http://127.0.0.1:39377/mcp", preferences.token.trim()),
  { dailyJotTag },
);
