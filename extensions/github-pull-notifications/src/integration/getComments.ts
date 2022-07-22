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
  pull_number: pull.number,
})

export const getPullComments = (params: GetCommentsParams): Promise<CommentShort[]> => Promise.resolve()
  .then(() => console.debug(`getPullComments for ${params.owner}/${params.repo}#${params.pull_number}`))
  .then(() => octokit.paginate(octokit.rest.pulls.listReviewComments, params))
  .then(res => res.map(mapPullCommentToShort))
  .then(comments => {
    console.debug(`getPullComments for ${params.owner}/${params.repo}#${params.pull_number} done (${comments.length})`);

    return comments;
  });

export const getIssueComments = ({ owner, repo, pull_number }: GetCommentsParams): Promise<CommentShort[]> => Promise.resolve()
  .then(() => console.debug(`getIssueComments for ${owner}/${repo}#${pull_number}`))
  .then(() => octokit.paginate(octokit.rest.issues.listComments, {owner, repo, issue_number: pull_number, per_page: 100}))
  .then(res => res.map(mapIssueCommentToShort))
  .then(comments => {
    console.debug(`getIssueComments for ${owner}/${repo}#${pull_number} done (${comments.length})`);

    return comments;
  });

