import { gql } from "graphql-request";

const repositoryFragment = gql`
  fragment repositoryFragment on Repository {
    id
    name
    nameWithOwner
    url
    description
    stargazerCount
    forkCount
    updatedAt
    visibility
    isFork
    isArchived
    primaryLanguage {
      name
      color
    }
    owner {
      login
      avatarUrl
    }
  }
`;

export const SEARCH_REPOSITORIES = gql`
  query searchRepositories($query: String!) {
    search(query: $query, first: 100, type: REPOSITORY) {
      nodes {
        ...repositoryFragment
      }
    }
  }

  ${repositoryFragment}
`;

export const GET_REPOSITORIES = gql`
  query getRepositories($username: String!) {
    user(login: $username) {
      repositories(first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          ...repositoryFragment
        }
      }
    }
  }

  ${repositoryFragment}
`;
