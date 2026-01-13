export interface ClickUpList {
  id: string;
  name: string;
  folder?: {
    id: string;
    name: string;
  };
  space?: {
    id: string;
    name: string;
  };
}

export interface ClickUpFolder {
  id: string;
  name: string;
  lists: ClickUpList[];
}

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color?: string;
  profilePicture?: string;
  initials?: string;
}

export interface ClickUpMember {
  user: ClickUpUser;
}

export enum Priority {
  Urgent = 1,
  High = 2,
  Normal = 3,
  Low = 4,
}

export interface CreateTaskPayload {
  name: string;
  description?: string;
  priority?: Priority;
  assignees?: number[];
  tags?: string[];
}

export const TASK_TAGS = [
  "feat",
  "bug",
  "docs",
  "ui",
  "refactor",
  "other",
] as const;
export type TaskTag = (typeof TASK_TAGS)[number];

export interface Preferences {
  apiToken: string;
  workspaceId: string;
  spaceId?: string;
}
