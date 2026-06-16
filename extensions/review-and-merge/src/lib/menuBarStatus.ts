import { ChecksState, PullRequest } from "../github/types";

const CHECKS_GLYPH: Record<Exclude<ChecksState, null>, string> = {
  SUCCESS: "✓",
  FAILURE: "✗",
  ERROR: "✗",
  PENDING: "⏳",
  EXPECTED: "⏳",
};

/** PR status folded into one short line (used as a submenu section header). */
export function menuBarStatusLine(pr: PullRequest): string {
  const parts: string[] = [];
  if (pr.isDraft) parts.push("draft");
  if (pr.checksState) parts.push(`checks ${CHECKS_GLYPH[pr.checksState]}`);
  if (pr.reviewDecision === "APPROVED") parts.push("approved");
  else if (pr.reviewDecision === "CHANGES_REQUESTED")
    parts.push("changes requested");
  return parts.join(" · ");
}
