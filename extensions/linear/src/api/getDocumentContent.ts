import { Document } from "@linear/sdk";

import { DocumentResult } from "./getDocuments";
import { getLinearClient } from "./linearClient";

export type DocumentWithContent = Pick<Document, "content"> & DocumentResult;

const docFragment = `
  id
  url
  icon
  color
  createdAt
  sortOrder
  title
  updatedAt
  project {
    id
    name
    icon
    color
  }
  initiative {
    id
    name
    color
    icon
  }
  creator {
    displayName
    avatarUrl
    email
  }
`;

export async function getDocumentContent(documentId: string) {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<
    { documents: { nodes: DocumentWithContent[] } },
    Record<string, unknown>
  >(
    `
      query($documentId: ID!) {
        documents(filter: { id: { eq: $documentId } }) {
          nodes {
            content
            ${docFragment}
          }
        }
      }
    `,
    { documentId },
  );

  return data?.documents.nodes?.[0];
}
