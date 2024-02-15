import { GithubDiscussion, GithubPullRequest } from "./integrations/github/types";
import { GoogleMailThread } from "./integrations/google-mail/types";
import { LinearNotification } from "./integrations/linear/types";
import { MutatePromise } from "@raycast/utils";
import { match, P } from "ts-pattern";
import { Page } from "./types";
import { Task } from "./task";

export interface Notification {
  id: string;
  title: string;
  source_id: string;
  status: NotificationStatus;
  metadata: NotificationMetadata;
  updated_at: Date;
  last_read_at?: Date;
  snoozed_until?: Date;
  user_id: string;
  task?: Task;
  details?: NotificationDetails;
}

export type NotificationMetadata =
  | {
      type: "Github" | "Todoist";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: any;
    }
  | { type: "Linear"; content: LinearNotification }
  | { type: "GoogleMail"; content: GoogleMailThread };

export type NotificationDetails =
  | { type: "GithubPullRequest"; content: GithubPullRequest }
  | { type: "GithubDiscussion"; content: GithubDiscussion };

export enum NotificationStatus {
  Unread = "Unread",
  Read = "Read",
  Deleted = "Deleted",
  Unsubscribed = "Unsubscribed",
}

export type NotificationListItemProps = {
  notification: Notification;
  mutate: MutatePromise<Page<Notification> | undefined>;
};

export function getNotificationHtmlUrl(notification: Notification) {
  return match(notification)
    .with(
      { details: { type: P.union("GithubPullRequest", "GithubDiscussion"), content: P.select() } },
      (notificationDetails) => notificationDetails.url,
    )
    .with(
      { metadata: { type: "Linear", content: { type: "IssueNotification", content: P.select() } } },
      (linearIssueNotification) => linearIssueNotification.issue.url,
    )
    .with(
      { metadata: { type: "Linear", content: { type: "ProjectNotification", content: P.select() } } },
      (linearProjectNotification) => linearProjectNotification.project.url,
    )
    .with(
      { metadata: { type: "GoogleMail", content: P.select() } },
      (googleMailThread) =>
        `https://mail.google.com/mail/u/${googleMailThread.user_email_address}/#inbox/${googleMailThread.id}`,
    )
    .with({ metadata: { type: "Todoist" } }, () => `https://todoist.com/showTask?id=${notification.source_id}`)
    .with({ metadata: { type: "Github" } }, () => "https://github.com")
    .exhaustive();
}

export function isNotificationBuiltFromTask(notification: Notification) {
  return notification.metadata.type === "Todoist";
}
