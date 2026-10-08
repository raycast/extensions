import { getLinearClient } from "../api/linearClient";

import { collectFiltered, CursorPageInput } from "./linearUtils";
import { withLinear } from "./withLinear";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Only return notifications that have not been read */ unreadOnly?: boolean;
}

/**
 * Lists the current user's Linear inbox.
 *
 * Queries GraphQL directly with a compact selection instead of reusing the UI's notification query, which embeds a full issue per notification and made unpaginated results large enough to derail the model.
 *
 * Linear's `NotificationFilter` has no read-state field, so `unreadOnly` filters fetched pages on the client. The scan stops after `MAX_UNREAD_SCAN_PAGES` pages so a long, mostly read inbox does not trigger a burst of requests; the returned cursor continues from there.
 */
export default withLinear(async (input: Input) => {
  const { graphQLClient } = getLinearClient();
  const page = await collectFiltered(
    async ({ first, after }) => {
      const { data } = await graphQLClient.rawRequest<NotificationPage, Record<string, unknown>>(NOTIFICATIONS_QUERY, {
        first,
        after,
      });
      if (!data) throw new Error("Failed to load notifications.");
      return data.notifications;
    },
    (notification) => !input.unreadOnly || !notification.readAt,
    input,
    input.unreadOnly ? MAX_UNREAD_SCAN_PAGES : undefined,
  );
  return { nodes: page.nodes.map(serializeNotification), nextCursor: page.nextCursor };
});

/** Flattens a notification to the fields needed to describe it, keeping comment bodies bounded so one long comment cannot dominate the result. */
function serializeNotification(notification: NotificationNode) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    subtitle: notification.subtitle,
    url: notification.url,
    createdAt: notification.createdAt,
    readAt: notification.readAt ?? undefined,
    snoozedUntilAt: notification.snoozedUntilAt ?? undefined,
    actor: notification.actor?.displayName ?? notification.botActor?.name ?? undefined,
    issue: notification.issue
      ? {
          identifier: notification.issue.identifier,
          title: notification.issue.title,
          url: notification.issue.url,
          status: notification.issue.state?.name,
        }
      : undefined,
    comment: notification.comment ? truncate(notification.comment.body, MAX_COMMENT_LENGTH) : undefined,
    project: notification.project ? { name: notification.project.name, url: notification.project.url } : undefined,
  };
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

const MAX_COMMENT_LENGTH = 500;
// Typed as `number` on purpose: with the literal type `3`, Ray CLI 2.7.0 crashes while extracting this tool's schema ("generalized source shouldn't be assignable").
const MAX_UNREAD_SCAN_PAGES: number = 3;

const NOTIFICATIONS_QUERY = `
  query ($first: Int, $after: String) {
    notifications(first: $first, after: $after) {
      nodes {
        id
        type
        title
        subtitle
        url
        createdAt
        readAt
        snoozedUntilAt
        actor { displayName }
        botActor { name }
        ... on IssueNotification {
          comment { body }
          issue { identifier title url state { name } }
        }
        ... on ProjectNotification {
          project { name url }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

type NotificationNode = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  url: string;
  createdAt: string;
  readAt?: string | null;
  snoozedUntilAt?: string | null;
  actor?: { displayName: string } | null;
  botActor?: { name?: string | null } | null;
  comment?: { body: string } | null;
  issue?: { identifier: string; title: string; url: string; state?: { name: string } | null } | null;
  project?: { name: string; url: string } | null;
};

type NotificationPage = {
  notifications: { nodes: NotificationNode[]; pageInfo: { hasNextPage: boolean; endCursor?: string | null } };
};
