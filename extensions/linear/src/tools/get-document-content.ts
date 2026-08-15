import { Document } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

import { DocumentResult } from "./get-documents";

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

export default withAccessToken(linear)(async (inputs: {
  /** The ID of the document/PRD to fetch */
  documentId: string;
}) => {
  return await getDocumentContent(inputs.documentId);
});
