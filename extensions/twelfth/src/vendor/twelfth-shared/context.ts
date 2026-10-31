// The workspace and personal settings every surface formats with, read from
// Twelfth rather than asked for again in the extension: the workspace's
// timezone and currency, and the person's own week start and name format.
//
// Cached for a few hours. They change rarely, and a fresh sign-in (possibly to
// another workspace) clears the cache (session.ts bumps the connection).
import { type KeyValueStore, type Session, CONTEXT_CACHE_KEY } from "./session";
import { type CallOptions, type CallTool, type Workspace, twelfthTools } from "./types";

export type WorkspaceContext = {
  workspace: Workspace | null;
  timeZone: string | undefined;
  /** Unset in the app means unknown: prices then show without a symbol rather than a guessed one. */
  currency: string | undefined;
  firstDayOfWeek: "monday" | "sunday";
  nameFormat: "full_name" | "first_name";
  /**
   * The person's theme in the Twelfth app, for surfaces that offer to match
   * it. Absent from contexts cached before it existed, and when the
   * connection can't read personal preferences.
   */
  appearance?: { theme?: string; preferredLight?: string; preferredDark?: string };
};

const TTL_MS = 6 * 60 * 60 * 1000;

export function workspaceContextReader(deps: {
  storage: KeyValueStore;
  session: Pick<Session, "apiKey" | "connectionEpoch">;
  callTool: CallTool;
}) {
  const { storage, session, callTool } = deps;
  const tools = twelfthTools(callTool);

  /**
   * The person's own preferences. A workspace key has no person behind it, and
   * a connection may not have been allowed the tool, so any failure means the
   * app's defaults rather than an error.
   */
  async function personalPreferences(options: CallOptions): Promise<Record<string, unknown>> {
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

  return async function workspaceContext(options: CallOptions = {}): Promise<WorkspaceContext> {
    // A changed workspace key, or a new OAuth connection, may point at another
    // workspace: both are part of the cache's identity.
    const epoch = await session.connectionEpoch();
    const credential = `${session.apiKey()?.slice(-8) ?? "oauth"}:${epoch}`;
    const cached = await storage.getItem<string>(CONTEXT_CACHE_KEY);
    if (cached) {
      try {
        const entry = JSON.parse(cached) as { at: number; credential: string; context: WorkspaceContext };
        if (entry.credential === credential && Date.now() - entry.at < TTL_MS) return entry.context;
      } catch {
        // A corrupt entry is just a miss.
      }
    }
    const [workspace, personal] = await Promise.all([tools.getWorkspace(options), personalPreferences(options)]);
    const context: WorkspaceContext = {
      workspace,
      timeZone: workspace?.timezone || undefined,
      currency: workspace?.currencyCode?.trim().toUpperCase() || undefined,
      firstDayOfWeek: personal.first_day_of_week === "sunday" ? "sunday" : "monday",
      nameFormat: personal.display_name_format === "first_name" ? "first_name" : "full_name",
      appearance: {
        theme: typeof personal.theme === "string" ? personal.theme : undefined,
        preferredLight: typeof personal.preferred_light_theme === "string" ? personal.preferred_light_theme : undefined,
        preferredDark: typeof personal.preferred_dark_theme === "string" ? personal.preferred_dark_theme : undefined,
      },
    };
    // A read that started before a sign-out or a new connection must not land
    // in the cache the new connection reads.
    if ((await session.connectionEpoch()) === epoch) {
      await storage.setItem(CONTEXT_CACHE_KEY, JSON.stringify({ at: Date.now(), credential, context }));
    }
    return context;
  };
}
