import { CommentShort, PullRequestID, PullSearchResultShort } from "./types";
import octokit from "./octokit";
import { mapIssueCommentToShort, mapPullCommentToShort } from "./mappers";

export const pullToCommentsParams = (pull: PullSearchResultShort): PullRequestID => ({
  owner: pull.repository_url.split("/")[4],
  repo: pull.repository_url.split("/")[5],
  pull_number: pull.number
});

export const getPullComments = (params: PullRequestID): Promise<CommentShort[]> => Promise.resolve()
  .then(logParams("getPullComments", params))
  .then(paginateListReviewComments(params))
  .then(comments => comments.map(mapPullCommentToShort))
  .then(teeShortComments("getPullComments", params))

const paginateListReviewComments = (params: PullRequestID) =>
  () => octokit.paginate(octokit.rest.pulls.listReviewComments, params);

export const getIssueComments = (params: PullRequestID): Promise<CommentShort[]> => Promise.resolve()
  .then(logParams("getIssueComments", params))
  .then(listLatestIssueComments(params))
  .then(res => res.map(mapIssueCommentToShort))
  .then(teeShortComments("getIssueComments", params));

const listLatestIssueComments = ({ owner, pull_number, repo }: PullRequestID) =>
  () => octokit.rest.issues.listComments({ owner, repo, issue_number: pull_number, sort: "created", direction: "desc" })
    .then(res => res.data);

const logParams = (prefix: string, { owner, pull_number, repo }: PullRequestID) =>
  () => console.debug(`${prefix}: ${owner}/${repo}#${pull_number}`);

const teeShortComments = (prefix: string, { owner, pull_number, repo }: PullRequestID) =>
  (comments: CommentShort[]) => Promise
    .resolve()
    .then(() => console.debug(`${prefix}: ${owner}/${repo}#${pull_number}, comments=${comments.length}`))
    .then(() => comments);
