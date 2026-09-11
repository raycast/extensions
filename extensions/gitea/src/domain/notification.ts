import type { Option } from "./options";

export const NotificationStatus = {
  Read: "read",
  Unread: "unread",
  Pinned: "pinned",
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const NotificationStatusFilter = {
  Unread: "unread",
  All: "all",
} as const;
export type NotificationStatusFilter = (typeof NotificationStatusFilter)[keyof typeof NotificationStatusFilter];

export const NotificationFilterOptions = [
  { id: "1", name: "Unread", value: NotificationStatusFilter.Unread },
  { id: "2", name: "All", value: NotificationStatusFilter.All },
] as const satisfies readonly Option<NotificationStatusFilter>[];
