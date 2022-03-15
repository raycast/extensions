import { useEffect } from "react";
import { jsonRequest, useQuery } from "../nextcloud";

export function useBoards() {
  const {
    state: { results, isLoading },
    perform,
  } = useQuery(({ signal }) => {
    return getBoards(signal);
  });

  useEffect(() => {
    perform();
  }, []);

  return {
    isLoading,
    boards: results ?? [],
    getBoards: perform,
  };
}

export function useStacks(boardId: number) {
  const {
    state: { results, isLoading },
    perform,
  } = useQuery(
    async ({ signal }: { signal: AbortSignal }): Promise<Stack[]> => {
      return getStacks(signal, boardId);
    },
    [boardId]
  );

  useEffect(() => {
    perform();
  }, []);

  return {
    isLoading,
    stacks: results ?? [],
    getStacks: perform,
  };
}

export async function getBoards(signal: AbortSignal): Promise<Board[]> {
  return await jsonRequest({ signal, base: "deck/api/v1.1/boards" });
}

export async function getStacks(signal: AbortSignal, boardId: number): Promise<Stack[]> {
  return await jsonRequest({ signal, base: `deck/api/v1.1/boards/${boardId}/stacks` });
}

export interface Board {
  title: string;
  owner: User;
  color: string;
  archived: boolean;
  labels: Label[];
  acl: Acl[];
  permissions: Permissions;
  users: User[];
  shared: number;
  stacks: unknown[];
  deletedAt: number;
  lastModified: number;
  settings: Settings;
  id: number;
  ETag: string;
}

export interface Stack {
  title: string;
  boardId: number;
  deletedAt: number;
  lastModified: number;
  cards: Card[];
  order: number;
  id: number;
  ETag: string;
}

export interface Card {
  title: string;
  description: string;
  stackId: number;
  type: string;
  lastModified: number;
  lastEditor: null;
  createdAt: number;
  labels: Label[];
  assignedUsers: User[];
  attachments: null;
  attachmentCount: number;
  owner: User;
  order: number;
  archived: boolean;
  duedate: string | null;
  deletedAt: number;
  commentsUnread: number;
  commentsCount: number;
  id: number;
  ETag: string;
  overdue: number;
}

export interface Label {
  title: string;
  color: string;
  boardId: number;
  cardId: number | null;
  lastModified: number;
  id: number;
  ETag: string;
}

export enum ParticipantType {
  User = 0,
  Group = 1,
  Circle = 2,
}

export interface Acl {
  participant: User;
  type: ParticipantType;
  boardId: number;
  permissionEdit: boolean;
  permissionShare: boolean;
  permissionManage: boolean;
  owner: boolean;
  id: number;
}

export interface User {
  primaryKey: string;
  uid: string;
  displayname: string;
  type: number;
}

export interface Permissions {
  PERMISSION_READ: boolean;
  PERMISSION_EDIT: boolean;
  PERMISSION_MANAGE: boolean;
  PERMISSION_SHARE: boolean;
}

export interface Settings {
  "notify-due": string;
  calendar: boolean;
}
