import { Notification } from "@linear/sdk";

import { getLinearClient } from "../api/linearClient";

export type UpdateNotificationPayload = {
  id: Notification["id"];
  readAt: Date | null;
};

export async function updateNotification(payload: UpdateNotificationPayload) {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<
    { notificationUpdate: { success: boolean } },
    Record<string, unknown>
  >(
    `
      mutation {
        notificationUpdate(id: "${payload.id}", input: {readAt: ${
          payload.readAt ? `"${payload.readAt.toISOString()}"` : null
        }}) {
          success
        }
      }
    `,
  );

  return { success: data?.notificationUpdate.success };
}
