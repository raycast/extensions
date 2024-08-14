import { gql } from "../../__generated__";

export const GET_VERSIONS = gql(`
  query Versions($owner: String!, $name: String!, $page: String) {
    repository(owner: $owner, name: $name) {
      releases(first: 100, after: $page) {
        nodes {
          name
          tagName
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

export const GET_LATEST_VERSION = gql(`
  query LatestVersion($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      latestRelease {
        name
        tagName
        tagCommit {
          commitUrl
        }
      }
    }
  }
`);
