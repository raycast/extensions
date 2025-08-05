import { getThirdPartyItemHtmlUrl, ThirdPartyItem } from "./third_party_item";
import { MutatePromise } from "@raycast/utils";
import { Page } from "./types";
import { Task } from "./task";

export interface Notification {
  id: string;
  title: string;
  status: NotificationStatus;
  created_at: Date;
  updated_at: Date;
  last_read_at?: Date;
  snoozed_until?: Date;
  user_id: string;
  task?: Task;
  kind: NotificationSourceKind;
  source_item: ThirdPartyItem;
}

export enum NotificationSourceKind {
  Github = "Github",
  Todoist = "Todoist",
  Linear = "Linear",
  GoogleMail = "GoogleMail",
  Slack = "Slack",
}

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

export function getNotificationHtmlUrl(notification: Notification): string {
  return getThirdPartyItemHtmlUrl(notification.source_item);
}

export function isNotificationBuiltFromTask(notification: Notification) {
  return notification.kind === NotificationSourceKind.Todoist;
}
