import {
  CommentShort,
  IssueComment,
  NullableSimpleUser,
  PullRequestReviewComment,
  PullSearchResult,
  PullSearchResultShort,
  UserShort
} from "./types";

export const mapPullSearchResultToShort =
  ({
     id, url, repository_url, html_url, number, title, state, created_at, updated_at, closed_at, user
   }: PullSearchResult): PullSearchResultShort => ({
    id, url, repository_url, html_url, number, title, state, created_at, updated_at, closed_at,
    user: mapUserShort(user)
  });

export const mapUserShort = (user: NullableSimpleUser): UserShort | null =>
  user === null ? null : ({
    login: user.login,
    avatar_url: user.avatar_url,
    url: user.url
  });

export const mapPullCommentToShort = ({ created_at, html_url, user }: PullRequestReviewComment): CommentShort => ({
  html_url, created_at,
  user: mapUserShort(user)
});

export const mapIssueCommentToShort = ({ created_at, html_url, user }: IssueComment): CommentShort => ({
  html_url, created_at,
  user: mapUserShort(user)
});