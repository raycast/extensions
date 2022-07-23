import octokit from "./octokit";
import { PullRequestID, PullRequestReview, PullRequestReviewShort } from "./types";

const getReviews = ({ owner, repo, pull_number }: PullRequestID): Promise<PullRequestReviewShort[]> =>
  octokit.paginate(octokit.rest.pulls.listReviews, { owner, repo, pull_number, per_page: 100 })
    .then((reviews => reviews.map(toShortReview)));

export default getReviews;

const toShortReview = ({ id, state, submitted_at }: PullRequestReview): PullRequestReviewShort => ({
  id, state, submitted_at
});
