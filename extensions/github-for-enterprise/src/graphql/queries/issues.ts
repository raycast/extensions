import { gql } from "graphql-request";

const templateFragment = gql`
  fragment templateFragment on Issue {
    id
    title
    body
    number
    url
    createdAt
    closed
    state
    author {
      avatarUrl
    }
    repository {
      nameWithOwner
    }
    comments {
      totalCount
    }
  }
`;

export const GET_OPEN_ISSUES = gql`
  query getIssues($username: String!) {
    user(login: $username) {
      issues(first: 100, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          ...templateFragment
        }
      }
    }
  }

  ${templateFragment}
`;

export const RECENT_ISSUES = gql`
  query recentIssues($username: String!) {
    user(login: $username) {
      issues(first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          ...templateFragment
        }
      }
    }
  }

  ${templateFragment}
`;

export const CLOSE_ISSUE = gql`
  mutation closeIssue($id: ID!) {
    closeIssue(input: { issueId: $id }) {
      issue {
        closed
      }
    }
  }
`;

export const REOPEN_ISSUE = gql`
  mutation reopenIssue($id: ID!) {
    reopenIssue(input: { issueId: $id }) {
      issue {
        closed
      }
    }
  }
`;

export const SEARCH_ISSUES = gql`
  query searchIssues($query: String!) {
    search(query: $query, first: 100, type: ISSUE) {
      nodes {
        ...templateFragment
      }
    }
  }

  ${templateFragment}
`;

export const GET_REPOSITORIES = gql`
  query getRepositories($username: String!) {
    user(login: $username) {
      repositories(first: 100) {
        nodes {
          id
          name
          nameWithOwner
          viewerPermission
          owner {
            login
            avatarUrl
          }
          assignableUsers(first: 100) {
            nodes {
              id
              login
            }
          }
          labels(first: 100) {
            nodes {
              id
              name
            }
          }
          projects(first: 100) {
            nodes {
              id
              name
            }
          }
          milestones(first: 100) {
            nodes {
              id
              title
            }
          }
        }
      }
    }
  }
`;

export const GET_ISSUE_TEMPLATES = gql`
  query getIssueTemplates($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      object(expression: "HEAD:.github/ISSUE_TEMPLATE") {
        ... on Tree {
          entries {
            name
            object {
              ... on Blob {
                text
              }
            }
          }
        }
      }
    }
  }
`;

export const CREATE_ISSUE = gql`
  mutation createIssue(
    $repositoryId: ID!
    $title: String!
    $body: String
    $assigneeIds: [ID]
    $labelIds: [ID]
    $milestoneId: ID
    $projectIds: [ID]
  ) {
    createIssue(
      input: {
        repositoryId: $repositoryId
        title: $title
        body: $body
        assigneeIds: $assigneeIds
        labelIds: $labelIds
        milestoneId: $milestoneId
        projectIds: $projectIds
      }
    ) {
      issue {
        number
      }
    }
  }
`;
