import type { DisplaySkill, HealthIssue } from "./types";

export function issuesForSkill(
  skill: DisplaySkill,
  issues: HealthIssue[],
): HealthIssue[] {
  return issues.filter((issue) => issueAffectsSkill(issue, skill));
}

function issueAffectsSkill(issue: HealthIssue, skill: DisplaySkill): boolean {
  const skillPaths = new Set([skill.primary.realPath, skill.primary.entryPath]);
  return issue.affectedPaths.some((path) => skillPaths.has(path));
}
