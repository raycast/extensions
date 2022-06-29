import { gql } from "@apollo/client";

const SEARCH_NOTEBOOK_FIELDS = gql`
  fragment SearchNotebookFields on Notebook {
    id
    title
    viewerHasStarred
    public
    stars {
      totalCount
    }
    creator {
      username
      displayName
      url
    }
    namespace {
      namespaceName
      url
    }
    blocks {
      __typename
      ... on MarkdownBlock {
        markdownInput
      }
      ... on QueryBlock {
        queryInput
      }
      ... on FileBlock {
        fileInput {
          repositoryName
          filePath
        }
      }
      ... on SymbolBlock {
        symbolInput {
          repositoryName
          filePath
          symbolName
          symbolContainerName
          symbolKind
        }
      }
    }
    createdAt
    updatedAt
  }
`;

export const GET_NOTEBOOKS = gql`
  ${SEARCH_NOTEBOOK_FIELDS}
  query GetNotebooks($query: String!, $orderBy: NotebooksOrderBy) {
    notebooks(query: $query, orderBy: $orderBy, descending: true) {
      nodes {
        ...SearchNotebookFields
      }
    }
  }
`;

const BATCH_CHANGE_FIELDS = gql`
  fragment BatchChangeFields on BatchChange {
    id
    url
    namespace {
      id
      namespaceName
    }
    name
    description
    creator {
      username
      displayName
    }
    state
    updatedAt
    changesetsStats {
      total
      merged
      open
      closed
      failed
      unpublished
      draft
    }
  }
`;

export const GET_BATCH_CHANGES = gql`
  ${BATCH_CHANGE_FIELDS}
  query GetBatchChanges {
    batchChanges(first: 100) {
      nodes {
        ...BatchChangeFields
      }
    }
  }
`;

export const changesetFieldsPossibleTypes = {
  Changeset: ["ExternalChangeset", "HiddenExternalChangeset"],
};

const CHANGESET_FIELDS = gql`
  fragment ChangesetFields on Changeset {
    __typename

    id
    state
    updatedAt

    ... on ExternalChangeset {
      repository {
        name
      }
      externalURL {
        url
        serviceKind
      }
      externalID
      title
      reviewState
      checkState
    }
  }
`;

export const GET_CHANGESETS = gql`
  ${CHANGESET_FIELDS}
  query GetChangesets($namespace: ID!, $name: String!) {
    batchChange(namespace: $namespace, name: $name) {
      changesets {
        nodes {
          ...ChangesetFields
        }
      }
    }
  }
`;

export const BLOB_CONTENTS = gql`
  fragment BlobContents on GitBlob {
    path
    content
    binary
    byteSize
  }
`;

export const GET_FILE_CONTENTS = gql`
  ${BLOB_CONTENTS}
  query GetFileContents($repo: String!, $rev: String!, $path: String!) {
    repository(name: $repo) {
      id
      commit(rev: $rev) {
        id
        blob(path: $path) {
          ...BlobContents
        }
      }
    }
  }
`;
