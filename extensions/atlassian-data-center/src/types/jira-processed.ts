import { List } from "@raycast/api";
import type { SetRequired, SetNonNullable } from "type-fest";

export interface ProcessedBase {
  renderKey: string;
}

type RequiredListItemPropsWithIcon = SetRequired<
  SetNonNullable<List.Item.Props, "icon" | "subtitle" | "accessories">,
  "icon" | "subtitle" | "accessories"
>;

type RequiredListItemPropsWithoutIcon = SetRequired<
  SetNonNullable<List.Item.Props, "subtitle" | "accessories">,
  "subtitle" | "accessories"
>;

type RequiredListItemPropsWithKeywords = SetRequired<
  SetNonNullable<List.Item.Props, "icon" | "subtitle" | "accessories" | "keywords">,
  "icon" | "subtitle" | "accessories" | "keywords"
>;

export type ProcessedJiraField = ProcessedBase &
  RequiredListItemPropsWithoutIcon & {
    id: string;
    name: string;
    custom: boolean;
    isAdded: boolean;
    keywords: List.Item.Props["keywords"];
    schema?: {
      type: string;
    };
  };

export type ProcessedJiraIssue = ProcessedBase &
  RequiredListItemPropsWithIcon & {
    key: string;
    summary: string;
    url: string;
    editUrl?: string;
  };

export type ProcessedJiraKanbanBoardIssue = ProcessedBase &
  RequiredListItemPropsWithKeywords & {
    key: string;
    summary: string;
    url: string;
    editUrl?: string;
    statusId?: string;
  };

export type ProcessedWorklog = ProcessedBase &
  RequiredListItemPropsWithKeywords & {
    url: string;
    timeSpent: string;
    timeSpentSeconds: number;
    comment: string;
    date: string;
    issueKey: string;
    worklogId: number;
  };

export type ProcessedJiraNotification = ProcessedBase &
  RequiredListItemPropsWithKeywords & {
    notificationId: number;
    issueKey: string;
    content: string;
    url: string;
    state: 0 | 1;
    actionTime: number;
    actionMakerAvatarUrl: string;
    actionMakerAvatarCacheKey?: string;
  };
