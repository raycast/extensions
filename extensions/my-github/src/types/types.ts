import { RestEndpointMethodTypes } from "@octokit/rest"
import { Endpoints } from "@octokit/types"

export type Usage = {
  lastUsed?: Date
  usageCount?: number
}
export type Usages = Record<string | number, Usage>
export type Repo =
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"][number]
export type PrDetailsRes = RestEndpointMethodTypes["pulls"]["get"]["response"]
export type PrReviewCommentsRes =
  RestEndpointMethodTypes["pulls"]["listReviewComments"]["response"]
export type PrReviewsRes =
  RestEndpointMethodTypes["pulls"]["listReviews"]["response"]
export type PrChecksRes =
  RestEndpointMethodTypes["checks"]["listForRef"]["response"]
export type PullRequestResponse = Endpoints["GET /search/issues"]["response"]
export type PullRequest = PullRequestResponse["data"]["items"][number]
export type PullRequestDetails = PrDetailsRes["data"]
export type PullRequestChecks = PrChecksRes["data"]
export type PullRequestReviews = PrReviewsRes["data"]
export type PullRequestReviewComments = PrReviewCommentsRes["data"]

export enum DecisionState {
  APPROVED = "APPROVED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
  REVIEW_REQUIRED = "REVIEW_REQUIRED",
}
