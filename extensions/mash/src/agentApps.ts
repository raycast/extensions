/**
 * Opening a chat in its agent's own desktop app. Only links checked against
 * the apps themselves are made:
 *
 * - Codex: the ChatGPT app, where Codex Desktop lives, registers codex:// and
 *   opens `codex://threads/<thread id>` at that thread, whether Codex Desktop
 *   or the Codex CLI recorded it.
 * - Claude Code: the Claude app registers claude:// and opens
 *   `claude://resume?session=<session id>&cwd=<folder>` at the app session
 *   that owns the transcript. A session the app does not own is added to the
 *   app as a new one, so the action says "Add to Claude" for it, from the
 *   app's own session files.
 *
 * The Copilot app's link needs the session behind Mash's hashed chat ID, which
 * only the dashboard works out; the other agents' apps have no link to one
 * chat.
 *
 * File reading is passed in, so this is tested without a Mac.
 */
import { join } from "node:path";

/** A desktop app that opens chats of one agent. */
export interface AgentApp {
  readonly agent: "codex" | "claude-code";
  /** The name the action uses: "Open in Codex". */
  readonly name: string;
  readonly bundles: readonly string[];
  readonly scheme: string;
}

export const agentApps: readonly AgentApp[] = [
  { agent: "codex", name: "Codex", bundles: ["ChatGPT.app", "Codex.app"], scheme: "codex" },
  { agent: "claude-code", name: "Claude", bundles: ["Claude.app"], scheme: "claude" },
];

/** Reads a text file, or answers undefined when it cannot. */
export type ReadText = (path: string) => string | undefined;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The agents whose app is installed in either Applications folder and
 * registers its scheme, which is what makes the app open its links.
 */
export function installedAgentApps(home: string, read: ReadText): AgentApp[] {
  return agentApps.filter((app) =>
    ["/Applications", join(home, "Applications")].some((folder) =>
      app.bundles.some((bundle) =>
        read(join(folder, bundle, "Contents/Info.plist"))?.includes(`<string>${app.scheme}</string>`),
      ),
    ),
  );
}

/** Where the Claude app keeps a file per session, two folders down. */
export function claudeSessionsFolder(home: string): string {
  return join(home, "Library/Application Support/Claude/claude-code-sessions");
}

/**
 * Which of `ids` the Claude app owns: a session file's own `cliSessionId` is
 * the chat's ID. Most files mention none of them, so only those that do are
 * parsed.
 */
export function claudeOwnedSessions(files: readonly string[], ids: readonly string[], read: ReadText): Set<string> {
  const owned = new Set<string>();
  for (const file of files) {
    const text = read(file);
    const named = text ? ids.filter((id) => !owned.has(id) && text.includes(id)) : [];
    if (!text || named.length === 0) continue;
    let session: unknown;
    try {
      session = JSON.parse(text);
    } catch {
      continue;
    }
    const cli = (session as { cliSessionId?: unknown } | null)?.cliSessionId;
    if (typeof cli === "string" && named.includes(cli)) owned.add(cli);
  }
  return owned;
}

/** Whether a file in the Claude app's sessions folder is a session's. */
export function isClaudeSessionFile(name: string): boolean {
  return name.startsWith("local_") && name.endsWith(".json");
}

/**
 * The title and link of the action that opens a chat in its agent's app, when
 * an installed app opens it; `owned` names the sessions the Claude app has.
 */
export function openInAgentApp(
  hit: { readonly agent: string; readonly chatId: string; readonly project?: string; readonly machine?: string },
  installed: readonly AgentApp[],
  owned: ReadonlySet<string>,
): { title: string; url: string } | undefined {
  // Mash's IDs for subagent chats are not a session either app knows, and a
  // chat from another machine is a session only that machine's apps hold.
  if (!uuid.test(hit.chatId) || hit.machine) return undefined;
  const app = installed.find((candidate) => candidate.agent === hit.agent);
  if (app?.agent === "codex") {
    return { title: `Open in ${app.name}`, url: `codex://threads/${hit.chatId}` };
  }
  if (app?.agent === "claude-code") {
    // The folder rides along so the app resumes the session where it ran.
    const folder = hit.project ? `&cwd=${encodeURIComponent(hit.project)}` : "";
    return {
      title: owned.has(hit.chatId) ? `Open in ${app.name}` : `Add to ${app.name}`,
      url: `claude://resume?session=${hit.chatId}${folder}`,
    };
  }
  return undefined;
}
