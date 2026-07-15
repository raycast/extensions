import { gitlab } from "../common";
import type { Project } from "../gitlabapi";

type Input = {
  /**
   * Search string for issue title/description
   */
  search?: string;
  /**
   * Target project ID; if omitted, search across all accessible issues
   */
  projectId?: number;
  /**
   * opened | closed | all
   */
  state?: "opened" | "closed" | "all";
  /**
   * Show only relevant to me (assigned_to_me, created_by_me, all)
   */
  scope?: "assigned_to_me" | "created_by_me" | "all";
  /**
   * Comma-separated labels to include
   */
  includeLabels?: string;
  /**
   * Comma-separated labels to exclude
   */
  excludeLabels?: string;
};

export default async function ({ search, projectId, state, scope, includeLabels, excludeLabels }: Input) {
  const params: Record<string, string> = {};

  if (search) params.search = search;
  if (state) params.state = state;
  if (scope) params.scope = scope;
  if (includeLabels) params.includeLabels = includeLabels;
  if (excludeLabels) params.excludeLabels = excludeLabels;

  const projectArg = projectId ? ({ id: projectId } as Project) : undefined;
  const issues = await gitlab.getIssues(params, projectArg);

  return issues;
}
