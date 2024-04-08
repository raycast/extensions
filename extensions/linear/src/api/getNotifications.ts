import { Organization, Comment, User, IssueNotification, ProjectUpdate, Project } from "@linear/sdk";
import { IssueFragment, IssueResult } from "./getIssues";
import { getLinearClient } from "../api/linearClient";

export type NotificationResult = Pick<
  IssueNotification,
  "id" | "type" | "createdAt" | "readAt" | "reactionEmoji" | "snoozedUntilAt"
> & {
  comment?: Pick<Comment, "body" | "url">;
} & {
  issue?: IssueResult;
} & {
  actor?: Pick<User, "displayName" | "avatarUrl">;
} & {
  projectUpdate?: Pick<ProjectUpdate, "url">;
} & {
  project?: Pick<Project, "url">;
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
            snoozedUntilAt
            actor {
              displayName
              avatarUrl
            }
            ... on IssueNotification {
              reactionEmoji
              comment {
                body
                url
              }
              issue {
                ${IssueFragment}
              }
            }
            ... on ProjectNotification {
              project {
                url
              }
              projectUpdate {
                url
              }
            }
          }
        }
        organization {
          urlKey
        }
      }
    `,
  );

  return { notifications: data?.notifications.nodes, urlKey: data?.organization.urlKey };
}
