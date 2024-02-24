import { Notification } from "@linear/sdk";
import { getLinearClient } from "../api/linearClient";

export async function deleteNotification(id: Notification["id"]) {
  const { graphQLClient } = getLinearClient();

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
