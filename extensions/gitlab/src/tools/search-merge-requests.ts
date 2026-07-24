import { gitlab } from "../common";
import { fetchMergeRequestsGqlList } from "../components/mr_gql";
import { MRScope, MRState } from "../components/mr";

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
   * all | assigned_to_me | created_by_me | reviews_for_me
   */
  scope?: "all" | "assigned_to_me" | "created_by_me" | "reviews_for_me";
  /**
   * Comma-separated labels to include
   */
  labels?: string;
};

export default async function ({ search, projectId, state, scope, labels }: Input) {
  const params: Record<string, string> = {};

  if (search) {
    params.search = search;
  }
  if (state) {
    params.state = state;
  }
  if (scope) {
    params.scope = scope;
  } else {
    params.scope = MRScope.all;
  }
  if (labels) {
    params.labels = labels;
  }
  if (!params.state) {
    params.state = MRState.opened;
  }

  const project = projectId ? await gitlab.getProject(projectId) : undefined;
  return fetchMergeRequestsGqlList({ params, project });
}
