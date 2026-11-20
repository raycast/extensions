import type { NotificationResult, OrganizationResult } from "./getNotifications";
import { getLinearClient } from "./linearClient";

type InboxPage = {
  inboxNotifications: {
    nodes: NotificationResult[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
  organization: OrganizationResult;
};

export async function getInboxNotifications() {
  const { graphQLClient } = getLinearClient();
  const notifications: NotificationResult[] = [];
  let urlKey: string | undefined;
  let after: string | null = null;

  do {
    const response: { data?: InboxPage } = await graphQLClient.rawRequest<InboxPage, Record<string, unknown>>(
      `query UnreadInbox($after: String) {
        inboxNotifications(unreadOnly: true, first: 50, after: $after) {
          nodes {
            id
            type
            createdAt
            readAt
            snoozedUntilAt
            title
            subtitle
            url
            actor { displayName avatarUrl }
            botActor { name }
          }
          pageInfo { hasNextPage endCursor }
        }
        organization { urlKey }
      }`,
      { after },
    );
    const data = response.data;

    if (!data) throw new Error("Failed to load inbox notifications.");

    notifications.push(...data.inboxNotifications.nodes);
    urlKey = data.organization.urlKey;
    const { hasNextPage, endCursor } = data.inboxNotifications.pageInfo;
    if (hasNextPage && (!endCursor || endCursor === after)) {
      throw new Error("Failed to load the next page of inbox notifications.");
    }
    after = hasNextPage ? endCursor : null;
  } while (after);

  return { notifications, urlKey };
}

export async function markInboxNotificationAsRead(id: string) {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { inboxNotificationUpdate: { success: boolean } },
    Record<string, unknown>
  >(
    `mutation ReadInboxGroup($id: String!) {
      inboxNotificationUpdate(id: $id, input: { read: true }) {
        success
      }
    }`,
    { id },
  );

  if (!data?.inboxNotificationUpdate.success) {
    throw new Error("Failed to mark the notification group as read.");
  }
}
