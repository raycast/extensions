import { PullRequest } from "../github/types";

export function canApprove(
  pr: PullRequest,
  viewerLogin: string | undefined,
): boolean {
  return (
    viewerLogin !== undefined &&
    pr.authorLogin !== viewerLogin &&
    !pr.viewerHasApproved
  );
}
