import type { PullRequestRef } from "./refs";

const NAME = "[A-Za-z0-9_.-]+";
const PATTERNS = [
  // owner/repo#123
  new RegExp(`^(${NAME})/(${NAME})#(\\d+)$`),
  // https://github.com/owner/repo/pull/123, optionally followed by /files, ?query, #anchor
  new RegExp(`^(?:https?://)?(?:www\\.)?github\\.com/(${NAME})/(${NAME})/pull/(\\d+)(?:[/?#].*)?$`),
  // https://app.graphite.com/github/pr/owner/repo/123[/title-slug]
  new RegExp(`^(?:https?://)?app\\.graphite\\.(?:com|dev)/github/pr/(${NAME})/(${NAME})/(\\d+)(?:[/?#].*)?$`),
];

/** Accepts the pull request formats people paste: `owner/repo#123`, a GitHub URL, or a Graphite URL. */
export function parsePullRequestInput(text: string): PullRequestRef | undefined {
  const trimmed = text.trim();
  for (const pattern of PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match) return { owner: match[1], repo: match[2], number: Number(match[3]) };
  }
  return undefined;
}

/** Like `parsePullRequestInput`, but throws an error the AI can relay and correct. */
export function requirePullRequest(text: string): PullRequestRef {
  const ref = parsePullRequestInput(text);
  if (!ref) {
    throw new Error(
      `"${text}" isn't a pull request reference. Use owner/repo#number (from get-inbox), a GitHub pull request URL, or a Graphite pull request URL.`,
    );
  }
  return ref;
}

export const formatPullRequest = (ref: PullRequestRef) => `${ref.owner}/${ref.repo}#${ref.number}`;
