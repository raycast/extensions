import { gql } from "@apollo/client";

export const PUBLISH_CHANGEST = gql`
  mutation PublishChangeset($batchChange: ID!, $changeset: ID!) {
    publishChangesets(batchChange: $batchChange, changesets: [$changeset]) {
      id
    }
  }
`;

export const REENQUEUE_CHANGEST = gql`
  mutation ReenqueueChangeset($changeset: ID!) {
    reenqueueChangeset(changeset: $changeset) {
      id
    }
  }
`;

export const MERGE_CHANGESET = gql`
  mutation MergeChangeset($batchChange: ID!, $changeset: ID!, $squash: Boolean) {
    mergeChangesets(batchChange: $batchChange, changesets: [$changeset], squash: $squash) {
      id
    }
  }
`;
