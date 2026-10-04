// The workspace and personal settings every command formats with, read from
// Twelfth rather than asked for again in Raycast: the workspace's timezone and
// currency, and the person's own week start and name format.
//
// Cached in LocalStorage for a few hours. They change rarely, the menu bar
// refreshes every 15 minutes, and a fresh sign-in (possibly to another
// workspace) clears the cache.
import { LocalStorage } from "@raycast/api";
import { apiKey } from "./auth";
import { CONTEXT_CACHE_KEY } from "./config";
import { callTool } from "./mcp";
import { type Workspace, getWorkspace } from "./twelfth";

export type WorkspaceContext = {
  workspace: Workspace | null;
  timeZone: string | undefined;
  currency: string;
  firstDayOfWeek: "monday" | "sunday";
  nameFormat: "full_name" | "first_name";
};

const TTL_MS = 6 * 60 * 60 * 1000;

export async function workspaceContext(options: { interactive?: boolean } = {}): Promise<WorkspaceContext> {
  // A changed workspace key in preferences may point at another workspace.
  const credential = apiKey()?.slice(-8) ?? "oauth";
  const cached = await LocalStorage.getItem<string>(CONTEXT_CACHE_KEY);
  if (cached) {
    try {
      const entry = JSON.parse(cached) as { at: number; credential: string; context: WorkspaceContext };
      if (entry.credential === credential && Date.now() - entry.at < TTL_MS) return entry.context;
    } catch {
      // A corrupt entry is just a miss.
    }
  }
  const [workspace, personal] = await Promise.all([getWorkspace(options), personalPreferences(options)]);
  const context: WorkspaceContext = {
    workspace,
    timeZone: workspace?.timezone ?? undefined,
    currency: workspace?.currencyCode ?? "AUD",
    firstDayOfWeek: personal.first_day_of_week === "sunday" ? "sunday" : "monday",
    nameFormat: personal.display_name_format === "first_name" ? "first_name" : "full_name",
  };
  await LocalStorage.setItem(CONTEXT_CACHE_KEY, JSON.stringify({ at: Date.now(), credential, context }));
  return context;
}

/**
 * The person's own preferences. A workspace key has no person behind it, and a
 * connection may not have been allowed the tool, so any failure means the
 * app's defaults rather than an error.
 */
async function personalPreferences(options: { interactive?: boolean }): Promise<Record<string, unknown>> {
  try {
    const result = await callTool<{ values?: Record<string, unknown> }>(
      "twelfth_get_preferences",
      { scope: "user" },
      options,
    );
    return result.values ?? {};
  } catch {
    return {};
  }
}
