import { LinearClient, Notification } from "@linear/sdk";

import { resolveClient } from "../api/linearClient";

export async function deleteNotification(id: Notification["id"], client?: LinearClient) {
  const { graphQLClient } = resolveClient(client);

  const { data } = await graphQLClient.rawRequest<
    { notificationArchive: { success: boolean } },
    Record<string, unknown>
  >(
    `
      mutation {
        notificationArchive(id: "${id}") {
          success
        }
      }
    `,
  );

  return { success: data?.notificationArchive.success };
}
