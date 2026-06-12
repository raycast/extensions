const PR_FIELDS = `
  fragment PrFields on PullRequest {
    id
    number
    title
    url
    state
    isDraft
    updatedAt
    headRefName
    author { login avatarUrl }
    repository { nameWithOwner viewerDefaultMergeMethod }
    reviewDecision
    mergeStateStatus
    autoMergeRequest { enabledAt }
    commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
    latestReviews(first: 50) { nodes { author { login } state } }
  }
`;

export const SEARCH_PULL_REQUESTS = `
  query SearchPullRequests($searchQuery: String!) {
    viewer { login }
    search(query: $searchQuery, type: ISSUE, first: 50) {
      nodes { ...PrFields }
    }
  }
  ${PR_FIELDS}
`;

export const SEARCH_REVIEW_REQUESTS = `
  query SearchReviewRequests($pendingQuery: String!, $closedQuery: String!) {
    viewer { login }
    pending: search(query: $pendingQuery, type: ISSUE, first: 50) {
      nodes { ...PrFields }
    }
    closed: search(query: $closedQuery, type: ISSUE, first: 50) {
      nodes { ...PrFields }
    }
  }
  ${PR_FIELDS}
`;

export const APPROVE_PULL_REQUEST = `
  mutation ApprovePullRequest($prId: ID!) {
    addPullRequestReview(input: { pullRequestId: $prId, event: APPROVE }) {
      clientMutationId
    }
  }
`;

export const MERGE_PULL_REQUEST = `
  mutation MergePullRequest($prId: ID!, $method: PullRequestMergeMethod!) {
    mergePullRequest(input: { pullRequestId: $prId, mergeMethod: $method }) {
      clientMutationId
    }
  }
`;

export const ENABLE_AUTO_MERGE = `
  mutation EnableAutoMerge($prId: ID!, $method: PullRequestMergeMethod!) {
    enablePullRequestAutoMerge(input: { pullRequestId: $prId, mergeMethod: $method }) {
      clientMutationId
    }
  }
`;

export const DISABLE_AUTO_MERGE = `
  mutation DisableAutoMerge($prId: ID!) {
    disablePullRequestAutoMerge(input: { pullRequestId: $prId }) {
      clientMutationId
    }
  }
`;
