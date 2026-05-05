import { handleOnCatchError } from "../api/errors-helper";
import { YouTrackApi } from "../api/youtrack-api";

const MAX_ISSUES = 50;

type Input = {
  /**
   * The project short name, e.g. `DEMO`
   */
  project: string;
  /**
   * The number of issues to fetch.
   */
  top?: number;
};

/**
 * Fetches issues from YouTrack for the specified project.
 */
export default async function getIssues(input: Input) {
  const api = YouTrackApi.getInstance();
  try {
    return await api.fetchIssues(`project: ${input.project}`, input.top ?? MAX_ISSUES);
  } catch (error) {
    handleOnCatchError(error, "Error fetching issues");
  }
}
