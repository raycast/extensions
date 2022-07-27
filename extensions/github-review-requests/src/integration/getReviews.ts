import octokit from "./octokit";
import { PullRequestID, PullRequestReview, PullRequestReviewShort } from "./types";
import { mapUserShort } from "./mappers";

const getReviews = ({ owner, repo, pull_number }: PullRequestID): Promise<PullRequestReviewShort[]> =>
  Promise.resolve()
    .then(() => console.debug(`getReviews: ${owner}/${repo}#${pull_number}`))
    .then(() => octokit.paginate(octokit.rest.pulls.listReviews, { owner, repo, pull_number, per_page: 100 }))
    .then((reviews => reviews.map(toShortReview)))
    .finally(() => console.debug(`getReviews: ${owner}/${repo}#${pull_number} done`));

export default getReviews;

const toShortReview = ({ id, state, user, html_url, submitted_at }: PullRequestReview): PullRequestReviewShort => ({
  id, state, html_url, submitted_at,
  user: mapUserShort(user)
});
