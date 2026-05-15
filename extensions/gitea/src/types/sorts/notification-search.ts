import { CommonOptionType } from "./common";

export const NotificationStatusFilter = {
  Unread: "unread",
  All: "all",
} as const;
export type NotificationStatusFilter = (typeof NotificationStatusFilter)[keyof typeof NotificationStatusFilter];

export const NotificationSortTypes: CommonOptionType[] = [
  { id: "1", name: "Unread", value: NotificationStatusFilter.Unread },
  { id: "2", name: "All", value: NotificationStatusFilter.All },
] as const;
