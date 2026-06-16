import { PullRequest } from "../github/types";

interface CanApproveOptions {
  /**
   * Allow approving regardless of PR state. Off by default, so closed/merged
   * PRs are not approvable. The Review Requests command turns this on: there
   * you're a requested reviewer and the intent is to approve even a PR that
   * was closed while your review was still pending. GitHub may still reject
   * the approval, which surfaces as an "Approve failed" toast.
   */
  ignoreState?: boolean;
}

export function canApprove(
  pr: PullRequest,
  viewerLogin: string | undefined,
  { ignoreState = false }: CanApproveOptions = {},
): boolean {
  return (
    (ignoreState || pr.state === "OPEN") &&
    viewerLogin !== undefined &&
    pr.authorLogin !== viewerLogin &&
    !pr.viewerHasApproved
  );
}
