import { Notification, Organization, Comment, User } from "@linear/sdk";
import { IssueFragment, IssueResult } from "./getIssues";
import { getLinearClient } from "../helpers/withLinearClient";

export type NotificationResult = Pick<Notification, "id" | "type" | "createdAt" | "readAt" | "reactionEmoji"> & {
  comment: Pick<Comment, "body">;
} & {
  issue: IssueResult;
} & {
  actor?: Pick<User, "displayName" | "avatarUrl">;
};

export type OrganizationResult = Pick<Organization, "urlKey">;

export async function getNotifications() {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { notifications: { nodes: NotificationResult[] } } & { organization: OrganizationResult },
    Record<string, unknown>
  >(
    `
      query {
        notifications {
          nodes {
            id
            type
            createdAt
            readAt
            actor {
              displayName
              avatarUrl
            }
            ... on IssueNotification {
              reactionEmoji
              issue {
                ${IssueFragment}
              }
            }
          }
        }
        organization {
          urlKey
        }
      }
    `
  );

  return { notifications: data?.notifications.nodes, urlKey: data?.organization.urlKey };
}
