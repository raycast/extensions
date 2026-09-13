import { Document, LinearClient } from "@linear/sdk";

import { resolveClient } from "../api/linearClient";

import { DocumentResult } from "./get-documents";
import { resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

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

export async function getDocumentContent(documentId: string, client?: LinearClient) {
  const { graphQLClient } = resolveClient(client);

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

type Input = {
  /** The ID of the document/PRD to fetch */
  documentId: string;

  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (inputs: Input) => {
  const client = await resolveToolClient(inputs.workspaceId);
  return await getDocumentContent(inputs.documentId, client);
});
