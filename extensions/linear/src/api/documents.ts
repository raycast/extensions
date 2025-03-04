import { getLinearClient } from "./linearClient";

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
