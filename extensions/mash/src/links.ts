/**
 * The ways out of a row to its chat: the mash:// links the desktop app opens,
 * the terminal commands that resume or search, what a chat offers to copy, and
 * what ↵ does when the desktop app is not there to open it.
 */
import type { Hit } from "./mash";

/**
 * The mash:// link that opens a chat in the desktop app: at the matching
 * message for a match, or at the chat itself for a recent chat.
 */
export function chatLink(hit: Pick<Hit, "chatId" | "messageId" | "matched" | "machine">): string {
  const chat = `mash://chat/${encodeURIComponent(hit.chatId)}`;
  // Another machine's chat opens by that machine, as the dashboard names it.
  const params = new URLSearchParams({
    ...(hit.machine ? { node: hit.machine } : {}),
    ...(hit.matched ? { message: hit.messageId } : {}),
  });
  return params.size ? `${chat}?${params}` : chat;
}

/**
 * The terminal command that resumes a chat in its agent's CLI, in the folder
 * it ran in. Only an agent's own sessions can be resumed: a subagent's ID is
 * Mash's, not a session the agent knows, and another machine's session is
 * not on this one. The folder is quoted for a POSIX shell.
 */
export function resumeCommand(
  hit: Pick<Hit, "agent" | "chatId" | "project" | "subagent" | "machine">,
): string | undefined {
  if (hit.subagent || hit.machine) return undefined;
  const resume =
    hit.agent === "claude-code"
      ? `claude --resume ${hit.chatId}`
      : hit.agent === "codex"
        ? `codex resume ${hit.chatId}`
        : undefined;
  if (!resume || !/^[\w-]+$/.test(hit.chatId)) return undefined;
  return hit.project ? `cd '${hit.project.replace(/'/g, `'\\''`)}' && ${resume}` : resume;
}

/** What can be copied from a chat. */
export type Copy = "resume" | "link" | "id" | "passage";

type Copied = Pick<Hit, "agent" | "chatId" | "project" | "subagent" | "machine" | "passage">;

/**
 * What a chat offers to copy, in the order listed. A mash:// link opens only
 * in the desktop app, so without it the message ID takes the link's place:
 * `mash view` and an agent's Mash tools read the message by it.
 */
export function copies(hit: Copied, hasApp: boolean): Copy[] {
  return [
    ...(resumeCommand(hit) ? (["resume"] as const) : []),
    hasApp ? "link" : "id",
    ...(hit.passage ? (["passage"] as const) : []),
  ];
}

/**
 * What ↵ does on a chat: open it in the desktop app at the match. Without the
 * app nothing on this machine is known to show a chat's messages (the
 * dashboard runs only while someone runs `mash dash`, at an address Mash does
 * not report), so ↵ copies the way back into the chat instead: the command
 * that resumes it in its agent, or else the message's ID.
 */
export function primaryAction(hit: Copied, hasApp: boolean): "open" | "resume" | "id" {
  if (hasApp) return "open";
  return resumeCommand(hit) ? "resume" : "id";
}

/** The mash:// link that opens Mash's main window, as the panel's Open Mash does. */
export const appLink = "mash://";

/** The mash:// link for Mash's full search of the same words. */
export function searchLink(query: string): string {
  return `mash://search?${new URLSearchParams({ q: query.trim() })}`;
}

/**
 * The terminal command for Mash's full search of the same words, for readers
 * without the desktop app. The words are quoted for a POSIX shell and follow
 * `--`, so words that start with a dash are searched for.
 */
export function searchCommand(query: string): string {
  return `mash search -- '${query.trim().replace(/'/g, `'\\''`)}'`;
}
