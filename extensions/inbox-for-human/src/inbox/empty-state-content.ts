/**
 * The command's public text and the checks that pick which empty screen shows.
 *
 * Lives outside `inbox.tsx` so unit tests can import it without the
 * @raycast/api runtime. Every string here is public Store copy.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { QueueLoad } from "./queue";

export const SKILL_URL = "https://github.com/jasonericsiegel/inbox-for-human";
export const INSTALL_PROMPT = `Install the inbox-for-human skill from ${SKILL_URL}`;

export const FIRST_RUN = {
  title: "Add the skill to your agent",
  description:
    "Claude Code or Codex adds the files it wants you to review here. Press ⏎ to copy the install prompt, then paste it into your agent.",
};

export const EMPTY_INBOX = {
  title: "Nothing waiting on you",
  description: "Files your agent asks you to review show up here.",
};

export const DAMAGED_TITLE = "Couldn't read your inbox";

export function damagedDescription(displayPath: string): string {
  return `The inbox file at ${displayPath} is damaged. The next time your agent adds a file, it saves a backup of this one and starts a new inbox.`;
}

export const OPEN_FAILED = "Couldn't open the file";

export const MARK_OPENED_FAILED = "Couldn't mark the file as opened";

export function archiveFailedTitle(count: number): string {
  return count === 1 ? "Couldn't archive the file" : "Couldn't archive the files";
}

/** Shown under a failure title when the skill is holding the inbox file. */
export const QUEUE_BUSY = "Your agent is adding a file to your inbox. Try again in a moment.";

export function archiveAllAlert(count: number): { title: string; message: string; button: string } {
  return {
    title: count === 1 ? "Archive 1 item?" : `Archive all ${count} items?`,
    message: "They leave your inbox. A file comes back if your agent adds it again.",
    button: "Archive All",
  };
}

/** Where the skill installs for Claude Code, and for Codex and most other agents. */
const SKILL_DIRS = [".claude/skills/inbox-for-human", ".agents/skills/inbox-for-human"];

/** Set up once the inbox file or either skill folder exists. */
export function isSetUp(queuePath: string, home: string = homedir()): boolean {
  return existsSync(queuePath) || SKILL_DIRS.some((dir) => existsSync(join(home, dir)));
}

/** Which empty screen to show, or null when there are items to list. */
export function emptyView(load: QueueLoad, setUp: boolean): "first-run" | "empty" | "damaged" | null {
  if (load.state === "damaged") return "damaged";
  if (load.entries.length > 0) return null;
  return setUp ? "empty" : "first-run";
}

/** A path under the home folder written as `~/…`, for showing it. */
export function tildify(path: string, home: string = homedir()): string {
  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}
