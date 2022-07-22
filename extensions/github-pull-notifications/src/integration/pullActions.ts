import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { Octokit } from "octokit";
import {
  CommentShort,
  IssueComment,
  NullableSimpleUser,
  PullRequestReviewComment,
  PullSearchResult,
  PullSearchResultShort, UserShort
} from "./types";

const githubAPIToken = getPreferenceValues()["githubAPIToken"];
const octokit = new Octokit({ auth: githubAPIToken });

export const getLogin = () => Promise.resolve()
  .then(() => console.debug("getLogin"))
  .then(() => LocalStorage.getItem("githubAPITokenLastValue"))
  .then(res => res as string | undefined || "")
  .then(token => {
    if (token && token === githubAPIToken) {
      return LocalStorage
        .getItem("githubLogin")
        .then(login => login as string)
        .then(login => {
          console.debug("resolved login from local storage", login)

          return login;
        });
    }

    return Promise.resolve()
      .then(() => console.debug("new or updated token detected - resolve user via API"))
      .then(() => octokit.request("GET /user"))
      .then(res => res.data.login)
      .then(login => Promise.all([
        LocalStorage.setItem("githubLogin", login),
        LocalStorage.setItem("githubAPITokenLastValue", githubAPIToken),
      ]).then(() => login));
  });

export const pullSearch = (query: string): Promise<PullSearchResultShort[]> => Promise.resolve()
  .then(() => console.debug(`pullSearch for ${query}`))
  .then(() => octokit.rest.search.issuesAndPullRequests({per_page: 100, q: `is:pr ${query}`}))
  .then(res => res.data.items || [])
  .then(items => items.map(mapPullSearchResultToShort))
  .finally(() => console.debug(`pullSearch for ${query} done`));

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

const mapPullSearchResultToShort =
  ({
     id, url, repository_url, html_url, number, title, state, created_at, updated_at, closed_at, user
   }: PullSearchResult): PullSearchResultShort => ({
    id, url, repository_url, html_url, number, title, state, created_at, updated_at, closed_at,
    user: mapUserShort(user),
  });

const mapUserShort = (user: NullableSimpleUser): UserShort | null =>
  user === null ? null : ({
    login: user.login,
    avatar_url: user.avatar_url,
    url: user.url,
  });

const mapPullCommentToShort = ({created_at, html_url, user}: PullRequestReviewComment): CommentShort => ({
  html_url, created_at,
  user: mapUserShort(user)
});

const mapIssueCommentToShort = ({created_at, html_url, user}: IssueComment): CommentShort => ({
  html_url, created_at,
  user: mapUserShort(user)
});

