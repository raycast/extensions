import { Document, Initiative, Project, User } from "@linear/sdk";
import { getLinearClient } from "./linearClient";
import { sortBy } from "lodash";

export type DocumentResult = Pick<
  Document,
  "id" | "url" | "color" | "createdAt" | "sortOrder" | "title" | "updatedAt" | "icon"
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

export type DocumentEntity = { projectId: string } | { initiativeId: string };

export async function getDocuments(query: string = "", entity: DocumentEntity = { projectId: "" }) {
  const { graphQLClient } = getLinearClient();

  const searchProject = "projectId" in entity && entity.projectId.length > 0;
  const searchInitiative = "initiativeId" in entity && entity.initiativeId.length > 0;
  const schema = `nodes { ${docFragment} } pageInfo { hasNextPage }`;

  const input = searchProject
    ? `
      query($query: String!, $projectId: ID!) {
        documents(orderBy: updatedAt, filter: { and: [ 
          { title: { containsIgnoreCase: $query } }, 
          { project: { id: { eq: $projectId } } } 
        ] }) { ${schema} } }
    `
    : searchInitiative
      ? `
      query($query: String!, $initiativeId: ID!) {
        documents(orderBy: updatedAt, filter: { and: [ 
          { title: { containsIgnoreCase: $query } }, 
          { initiative: { id: { eq: $initiativeId } } } 
        ] }) { ${schema} } }
    `
      : `
      query($query: String!) { documents(orderBy: updatedAt, filter: { title: { containsIgnoreCase: $query } }) { ${schema} } }
    `;

  const variables = searchProject || searchInitiative ? { query: query.trim(), ...entity } : { query: query.trim() };

  const { data } = await graphQLClient.rawRequest<DocList, Record<string, unknown>>(input, variables);

  const docs = sortBy(data?.documents.nodes ?? [], (doc) => doc.sortOrder ?? Infinity);
  const hasMoreDocs = !!data?.documents.pageInfo.hasNextPage;

  return { docs, hasMoreDocs };
}

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
