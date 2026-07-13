/**
 * Dokploy puts the commit in a deployment's `description`, but the format varies by how the
 * deploy was triggered: `"Commit: <40-char sha>"` for a git push, and `""`, `"NEW CHANGES"` or
 * `"Manual deployment"` otherwise. A 40-char sha eats the whole row and pushes the status and
 * date off the right edge, so shorten it the way git itself does.
 */
const COMMIT_PATTERN = /^\s*commit:\s*([0-9a-f]{7,40})\s*$/i;

export function formatDeploymentSubtitle(description?: string | null): string | undefined {
  const value = description?.trim();
  if (!value) return undefined;

  const commit = value.match(COMMIT_PATTERN);
  if (commit) return commit[1].slice(0, 7);

  return value;
}

/** The full description, for the tooltip and the copy action - nothing is lost, just moved. */
export function fullDeploymentDescription(description?: string | null): string | undefined {
  return description?.trim() || undefined;
}

/**
 * A deployment's `title` is the *whole* commit message - subject line, blank line and body. Passed
 * straight to a menu-bar item it renders as a wall of text, so only the subject line survives.
 */
export function firstLine(text?: string | null): string {
  return (text ?? "").split(/\r?\n/, 1)[0].trim();
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** The one-line summary of a deployment, for a menu item that has no room for more. */
export function deploymentHeadline(title?: string | null, max = 64): string {
  const line = firstLine(title);
  return line ? truncate(line, max) : "Deployment";
}

/** Everything after the commit's subject line, for the one view with room to show it. */
export function commitMessageBody(title?: string | null): string | undefined {
  const lines = (title ?? "").split(/\r?\n/);
  if (lines.length < 2) return undefined;
  return lines.slice(1).join("\n").trim() || undefined;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Menu-bar items have no date accessory, so the age goes in the subtitle as text. */
export function relativeTime(value?: string | null): string {
  if (!value) return "";

  const elapsed = Date.now() - new Date(value).getTime();
  if (Number.isNaN(elapsed)) return "";
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  return `${Math.floor(elapsed / DAY)}d ago`;
}
