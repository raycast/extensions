import { gql } from "graphql-request";

const templateFragment = gql`
  fragment templateFragment on PullRequest {
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
      mergeCommitAllowed
      rebaseMergeAllowed
      squashMergeAllowed
    }
    comments {
      totalCount
    }
  }
`;

export const GET_OPEN_PRS = gql`
  query getPRS($username: String!) {
    user(login: $username) {
      pullRequests(first: 100, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          ...templateFragment
        }
      }
    }
  }

  ${templateFragment}
`;

export const GET_PRS = gql`
  query getPRS($username: String!) {
    user(login: $username) {
      pullRequests(first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          ...templateFragment
        }
      }
    }
  }

  ${templateFragment}
`;

export const CLOSE_PR = gql`
  mutation closePR($id: ID!) {
    closePullRequest(input: { pullRequestId: $id }) {
      pullRequest {
        closed
      }
    }
  }
`;

export const REOPEN_PR = gql`
  mutation reopenPR($id: ID!) {
    reopenPullRequest(input: { pullRequestId: $id }) {
      pullRequest {
        closed
      }
    }
  }
`;

export const ADD_PR_REVIEW = gql`
  mutation addPRReview($id: ID!, $body: String!) {
    addPullRequestReview(input: { pullRequestId: $id, body: $body }) {
      pullRequestReview {
        id
      }
    }
  }
`;

export const SUBMIT_PR_REVIEW = gql`
  mutation submitPRReview($pullRequestId: ID!, $pullRequestReviewId: ID!, $event: String!) {
    submitPullRequestReview(
      input: { pullRequestId: $pullRequestId, pullRequestReviewId: $pullRequestReviewId, event: $event }
    ) {
      pullRequestReview {
        id
      }
    }
  }
`;

export const MERGE_PR = gql`
  mutation mergePR($pullRequestId: ID!, $mergeMethod: String!) {
    mergePullRequest(input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }) {
      pullRequest {
        merged
      }
    }
  }
`;
