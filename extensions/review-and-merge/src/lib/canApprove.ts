import { PullRequest } from "../github/types";

export function canApprove(
  pr: PullRequest,
  viewerLogin: string | undefined,
): boolean {
  return (
    pr.state === "OPEN" &&
    viewerLogin !== undefined &&
    pr.authorLogin !== viewerLogin &&
    !pr.viewerHasApproved
  );
}
