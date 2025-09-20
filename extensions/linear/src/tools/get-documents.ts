import { Document, Initiative, Project, User } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";
import { sortBy } from "lodash";

import { getLinearClient, linear } from "../api/linearClient";

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

type DocList = {
  documents: { nodes: DocumentResult[]; pageInfo: { hasNextPage: boolean } };
};

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

export default withAccessToken(linear)(async (inputs: {
  /** Search query to filter documents */
  query?: string;
  /** Restrict the documents/PRDs returned to a specific initiative */
  initiativeId?: string;
  /** Restrict the documents/PRDs returned to a specific project */
  projectId?: string;
}) => {
  let entity: DocumentEntity = { projectId: "" };
  if (inputs.projectId) {
    entity = { projectId: inputs.projectId };
  } else if (inputs.initiativeId) {
    entity = { initiativeId: inputs.initiativeId };
  }
  return (await getDocuments(inputs.query || undefined, entity)).docs;
});
