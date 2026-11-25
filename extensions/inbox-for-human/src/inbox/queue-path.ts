import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_QUEUE_PATH = ".agents/inbox-for-human/queue.json";

/**
 * Expand a leading `~` to the user's home directory.
 *
 * Only expands a literal `~` at the start of the string (or `~/`); does not
 * expand `~user` notation.
 */
export function expandHome(p: string, home: string = homedir()): string {
  if (p === "~") return home;
  if (p.startsWith("~/")) return join(home, p.slice(2));
  return p;
}

/**
 * Resolve the queue path from the env var, falling back to the default.
 *
 * Returns an absolute path. Honors `INBOX_QUEUE_PATH` if set; otherwise
 * returns `~/.agents/inbox-for-human/queue.json`.
 */
export function resolveQueuePath(env: NodeJS.ProcessEnv = process.env, home: string = homedir()): string {
  const fromEnv = env.INBOX_QUEUE_PATH;
  if (fromEnv && fromEnv.trim().length > 0) {
    return expandHome(fromEnv.trim(), home);
  }
  return join(home, DEFAULT_QUEUE_PATH);
}

/**
 * Derive the archive path from the queue path.
 *
 * Replaces the trailing `.json` with `.archive.jsonl`. If the queue path
 * doesn't end in `.json`, the archive sibling becomes `<queuePath>.archive.jsonl`.
 */
export function archivePathFor(queuePath: string): string {
  if (queuePath.endsWith(".json")) {
    return queuePath.slice(0, -".json".length) + ".archive.jsonl";
  }
  return queuePath + ".archive.jsonl";
}
