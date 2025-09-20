import { Organization, Comment, User, IssueNotification, ProjectUpdate, Project, ActorBot } from "@linear/sdk";

import { getLinearClient } from "../api/linearClient";

import { IssueFragment, IssueResult } from "./getIssues";

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
  project?: Pick<Project, "url" | "name">;
} & {
  botActor?: Pick<ActorBot, "name">;
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
            botActor {
              name
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
                name
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
