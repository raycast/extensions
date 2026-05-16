import { getErrorIssue } from "../api/errors";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The error tracking issue ID. Get this from `list-errors`. */
  issueId: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const issue = await getErrorIssue(projectId, input.issueId);
  return { ...issue, url: projectUrl(`error_tracking/${input.issueId}`) };
}
