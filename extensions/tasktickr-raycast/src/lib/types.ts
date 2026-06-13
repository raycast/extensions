// Domain types come from the shared core (web/shared/task-core.d.ts) so all
// clients stay in sync; only Raycast-specific shapes are declared here.
export type {
  Priority,
  Recurrence,
  PostponeRule,
  PostponePreset,
} from "@shared/task-core";
import type { Priority, Recurrence, PostponePreset } from "@shared/task-core";

export type TaskStatus = "OPEN" | "STARTED" | "DONE";

export interface Task {
  id: string;
  title: string;
  note: string | null;
  dueDate: string | null;
  priority: Priority;
  status: TaskStatus;
  workspaceId: string | null;
  parentId: string | null;
  recurrence: Recurrence | null;
  recurrenceDays: number | null;
  durationMinutes: number | null;
  notifyOnDue: boolean | null;
  sortOrder: number;
  createdAt: string;
  followUpOfId?: string | null;
  assignees?: {
    user: { id: string; name: string; avatarKey: string | null };
  }[];
  subtasks?: Task[];
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  organizationId?: string | null;
}

export interface UserSettings {
  postponePresets: PostponePreset[] | null;
  notifyOnDue: boolean;
}
