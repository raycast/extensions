import { gql } from "graphql-request";

export type ExtendedRepositoryFieldsFragment = {
  __typename?: "Repository";
  id: string;
  nameWithOwner: string;
  name: string;
  url: any;
  mergeCommitAllowed: boolean;
  squashMergeAllowed: boolean;
  rebaseMergeAllowed: boolean;
  updatedAt: any;
  pushedAt?: any | null;
  stargazerCount: number;
  isArchived: boolean;
  isFork: boolean;
  viewerHasStarred: boolean;
  hasIssuesEnabled: boolean;
  hasWikiEnabled: boolean;
  hasProjectsEnabled: boolean;
  hasDiscussionsEnabled: boolean;
  owner:
    | { __typename?: "Organization"; login: string; avatarUrl: any }
    | { __typename?: "User"; login: string; avatarUrl: any };
  primaryLanguage?: { __typename?: "Language"; id: string; name: string; color?: string | null } | null;
  releases: { __typename?: "ReleaseConnection"; totalCount: number };
};

export const GET_REPOSITORIES = gql`
  query getRepositories($username: String!) {
    user(login: $username) {
      repositories(first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          id
          name
          description
          url
          updatedAt
          stargazerCount
          forkCount
          primaryLanguage {
            name
            color
          }
          owner {
            login
            avatarUrl
          }
        }
      }
    }
  }
`;
