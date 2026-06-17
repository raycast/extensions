import { gitlab } from "../common";
import type { Project } from "../gitlabapi";

type Input = {
  /**
   * Search string for MR title/description
   */
  search?: string;
  /**
   * Target project ID; if omitted, search across all accessible MRs
   */
  projectId?: number;
  /**
   * opened | closed | merged | all
   */
  state?: "opened" | "closed" | "merged" | "all";
  /**
   * all | assigned_to_me | created_by_me | reviewed_by_me
   */
  scope?: "all" | "assigned_to_me" | "created_by_me" | "reviewed_by_me";
  /**
   * Comma-separated labels to include
   */
  labels?: string;
};

export default async function ({ search, projectId, state, scope, labels }: Input) {
  const params: Record<string, string> = {};

  if (search) params.search = search;
  if (state) params.state = state;
  if (scope) params.scope = scope;
  if (labels) params.labels = labels;

  const projectArg = projectId ? ({ id: projectId } as Project) : undefined;
  const mrs = await gitlab.getMergeRequests(params, projectArg);

  return mrs;
}
