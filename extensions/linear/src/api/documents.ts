import { Document, Initiative, Project, User } from "@linear/sdk";
import { getLinearClient } from "./linearClient";
import { sortBy } from "lodash";
import { getPreferenceValues } from "@raycast/api";

export type DocumentResult = Pick<
  Document,
  "id" | "url" | "color" | "createdAt" | "slugId" | "sortOrder" | "title" | "updatedAt" | "icon" | "archivedAt"
> & {
  project?: Pick<Project, "id" | "name" | "icon" | "color">;
} & {
  creator: Pick<User, "displayName" | "avatarUrl" | "email">;
} & {
  initiative?: Pick<Initiative, "id" | "name" | "color" | "icon">;
};

export type DocList = {
  documents: { nodes: DocumentResult[]; pageInfo: { hasNextPage: boolean } };
};

export type DocContent = Pick<Document, "content" | "id">;

const docFragment = `
  id
  url
  icon
  color
  createdAt
  archivedAt
  slugId
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

export async function getDocuments(query: string = "", projectId: string = "") {
  const { graphQLClient } = getLinearClient();
  const { showArchivedDocs } = getPreferenceValues<Preferences>();

  const input = !projectId.trim().length
    ? `
      query($query: String!) {
        documents(orderBy: updatedAt, includeArchived: ${showArchivedDocs}, filter: { title: { containsIgnoreCase: $query } } ) {
          nodes {
            ${docFragment}
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `
    : `
      query($query: String!, $projectId: ID!) {
        documents(orderBy: updatedAt, includeArchived: ${showArchivedDocs}, filter: { and: [ 
          { title: { containsIgnoreCase: $query } }, 
          { project: { id: { eq: $projectId } } } 
        ] }) {
          nodes {
            ${docFragment}
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

  const variables = !projectId.trim().length
    ? { query: query.trim() }
    : { query: query.trim(), projectId: projectId.trim() };

  const { data } = await graphQLClient.rawRequest<DocList, Record<string, unknown>>(input, variables);

  const docs = sortBy(data?.documents.nodes ?? [], (doc) => doc.sortOrder ?? Infinity);
  const hasMoreDocs = !!data?.documents.pageInfo.hasNextPage;

  return { docs, hasMoreDocs };
}

export async function getDocumentContent(documentId: string) {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<{ documents: { nodes: DocContent[] } }, Record<string, unknown>>(
    `
      query($documentId: ID!) {
        documents(filter: { id: { eq: $documentId } }) {
          nodes {
            content
            id
          }
        }
      }
    `,
    { documentId },
  );

  return data?.documents.nodes?.[0];
}

export async function restoreDocument(documentId: string) {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<{ documentUnarchive: { success: boolean } }, Record<string, unknown>>(
    `
      mutation {
        documentUnarchive(id: "${documentId}") {
          success
        }
      }
    `,
  );

  return { success: data?.documentUnarchive.success };
}

export async function deleteDocument(documentId: string) {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<{ documentDelete: { success: boolean } }, Record<string, unknown>>(
    `
      mutation {
        documentDelete(id: "${documentId}") {
          success
        }
      }
    `,
  );

  return { success: data?.documentDelete.success };
}

export type DocUpdatePayload = Partial<{
  projectId: string;
  initiativeId: string;
}>;

export async function updateDocument(documentId: string, payload: DocUpdatePayload) {
  const { graphQLClient } = getLinearClient();

  let docUpdateInput = `projectId: ${payload.projectId ? `"${payload.projectId}"` : null}`;
  docUpdateInput += `, initiativeId: ${payload.initiativeId ? `"${payload.initiativeId}"` : null}`;

  const { data } = await graphQLClient.rawRequest<{ documentUpdate: { success: boolean } }, Record<string, unknown>>(
    `
      mutation {
        documentUpdate(id: "${documentId}", input: {${docUpdateInput}}) {
          success
        }
      }
    `,
  );

  return { success: data?.documentUpdate.success };
}
