import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { Octokit } from "octokit";
import {components} from "@octokit/openapi-types"

const githubAPIToken = getPreferenceValues()["githubAPIToken"];
const octokit = new Octokit({ auth: githubAPIToken });


export function getLogin() {
  return Promise.resolve()
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
    })
}

export function pullSearch(query: string): Promise<PullSearchResultShort[]> {
  return Promise.resolve()
    .then(() => console.debug(`pullSearch for ${query}`))
    .then(() => octokit.rest.search.issuesAndPullRequests({per_page: 100, q: `is:pr ${query}`}))
    .then(res => res.data.items || [])
    .then(items => items.map(mapPullSearchResultToShort))
    .finally(() => console.debug(`pullSearch for ${query} done`))
}

export type GetCommentsParams = {
  owner: string;
  repo: string;
  pull_number: number;
};

export function pullToCommentsParams(pull: PullSearchResultShort): GetCommentsParams {
  return {
    owner: pull.repository_url.split("/")[4],
    repo: pull.repository_url.split("/")[5],
    pull_number: pull.number,
  }
}

export function getPullComments(params: GetCommentsParams): Promise<CommentShort[]> {
  return Promise.resolve()
    .then(() => console.debug(`getPullComments for ${params.owner}/${params.repo}#${params.pull_number}`))
    .then(() => octokit.paginate(octokit.rest.pulls.listReviewComments, params))
    .then(res => res.map(mapPullCommentToShort))
    .then(comments => {
      console.debug(`getPullComments for ${params.owner}/${params.repo}#${params.pull_number} done (${comments.length})`);

      return comments;
    })
}

export function getIssueComments({ owner, repo, pull_number }: GetCommentsParams): Promise<CommentShort[]> {
  return Promise.resolve()
    .then(() => console.debug(`getIssueComments for ${owner}/${repo}#${pull_number}`))
    .then(() => octokit.paginate(octokit.rest.issues.listComments, {owner, repo, issue_number: pull_number, per_page: 100}))
    .then(res => res.map(mapIssueCommentToShort))
    .then(comments => {
      console.debug(`getIssueComments for ${owner}/${repo}#${pull_number} done (${comments.length})`);

      return comments;
    })
}

type PullSearchResult = components["schemas"]["issue-search-result-item"];
type NullableSimpleUser = components["schemas"]["nullable-simple-user"];
type PullRequestReviewComment = components["schemas"]["pull-request-review-comment"];
type IssueComment = components["schemas"]["issue-comment"];

export type PullSearchResultShort = {
  id: number;
  url: string;
  repository_url: string;
  html_url: string;
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: UserShort | null;
}

export type UserShort = {
  login: string;
  avatar_url: string;
  url: string;
};

export type CommentShort = {
  created_at: string;
  html_url: string;
  user: UserShort | null;
};

const mapPullSearchResultToShort =
  ({
    id, url, repository_url, html_url, number, title, state, created_at, updated_at, closed_at, user
}: PullSearchResult): PullSearchResultShort => ({
  id, url, repository_url, html_url, number, title, state, created_at, updated_at, closed_at,
  user: mapUserShort(user),
})

const mapUserShort = (user: NullableSimpleUser): UserShort | null =>
  user === null ? null : ({
    login: user.login,
    avatar_url: user.avatar_url,
    url: user.url,
  })

const mapIssueCommentToShort = ({created_at, html_url, user}: IssueComment): CommentShort => ({
  html_url, created_at,
  user: mapUserShort(user)
})

const mapPullCommentToShort = ({created_at, html_url, user}: PullRequestReviewComment): CommentShort => ({
  html_url, created_at,
  user: mapUserShort(user)
})