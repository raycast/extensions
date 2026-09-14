import { LinearClient } from "@linear/sdk";

import { resolveClient } from "./linearClient";

export async function deleteDocument(documentId: string, client?: LinearClient) {
  const { graphQLClient } = resolveClient(client);

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

export async function updateDocument(documentId: string, payload: DocUpdatePayload, client?: LinearClient) {
  const { graphQLClient } = resolveClient(client);

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
