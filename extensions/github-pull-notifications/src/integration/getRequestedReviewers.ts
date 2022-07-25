import octokit from "./octokit";
import { PullRequestID } from "./types";

const getRequestedReviewers = (prid: PullRequestID) => Promise.resolve()
  .then(() => octokit.rest.pulls.listRequestedReviewers(prid))
  .then(res => res.data);

export default getRequestedReviewers;
