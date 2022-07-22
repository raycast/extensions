import { CommentShort, PullSearchResultShort } from "./types";
import octokit from "./octokit";
import { mapIssueCommentToShort, mapPullCommentToShort } from "./mappers";

export type GetCommentsParams = {
  owner: string;
  repo: string;
  pull_number: number;
};

export const pullToCommentsParams = (pull: PullSearchResultShort): GetCommentsParams => ({
  owner: pull.repository_url.split("/")[4],
  repo: pull.repository_url.split("/")[5],
  pull_number: pull.number
});

export const getPullComments = (params: GetCommentsParams): Promise<CommentShort[]> => Promise.resolve()
  .then(logParams("getPullComments", params))
  .then(paginateListReviewComments(params))
  .then(comments => comments.map(mapPullCommentToShort))
  .then(teeShortComments("getPullComments", params))

const paginateListReviewComments = (params: GetCommentsParams) =>
  () => octokit.paginate(octokit.rest.pulls.listReviewComments, params);

export const getIssueComments = (params: GetCommentsParams): Promise<CommentShort[]> => Promise.resolve()
  .then(logParams("getIssueComments", params))
  .then(paginateListIssuesComments(params))
  .then(res => res.map(mapIssueCommentToShort))
  .then(teeShortComments("getIssueComments", params));

const paginateListIssuesComments = ({ owner, pull_number, repo }: GetCommentsParams) =>
  () => octokit.paginate(octokit.rest.issues.listComments, { owner, repo, issue_number: pull_number, per_page: 100 });

const teeShortComments = (prefix: string, { owner, pull_number, repo }: GetCommentsParams) =>
  (comments: CommentShort[]) => Promise
    .resolve()
    .then(() => console.debug(`${prefix} ${owner}/${repo}#${pull_number}: ${comments.length} comments`))
    .then(() => comments);

const logParams = (prefix: string, { owner, pull_number, repo }: GetCommentsParams) =>
  () => console.debug(`${prefix} for ${owner}/${repo}#${pull_number}`);