/**
 * The slice of Hule's REST DTOs this extension consumes.
 *
 * Deliberately hand-written and narrow rather than imported from the monorepo's
 * shared packages: a Store extension's source lives in raycast/extensions and
 * installs from the public registry, so a workspace dependency would not
 * resolve there. Extra fields on the wire are ignored — the API stays the
 * source of truth.
 */

/** A description/body is either plain text or the editor's own document. */
export type RichValue = string | { type: "doc"; content?: unknown[] } | null;

export type Priority = "none" | "low" | "normal" | "high" | "urgent";

export const PRIORITIES: Priority[] = ["none", "low", "normal", "high", "urgent"];

export interface Task {
  id: string;
  workspaceId: string;
  listId: string;
  parentId: string | null;
  title: string;
  description?: RichValue;
  statusId: string;
  statusGroup: string;
  priority: Priority;
  startDate?: string;
  dueDate?: string;
  allDay: boolean;
  assigneeId: string | null;
  tagIds: string[];
  completedAt: string | null;
  taskKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerMemberId: string;
}

export interface Member {
  id: string;
  workspaceId: string;
  userId: string | null;
  email: string | null;
  status: string;
  name: string | null;
  /** Color of the letter-avatar the app draws for this person. */
  avatarColor?: string | null;
  /** Relative path to the photo, or null when this person shows letters. */
  avatarUrl?: string | null;
}

export interface TemplateStatus {
  id: string;
  label: string;
  group: string;
  /** Icon chosen in the status template — its NAME in the app's own icon set. */
  iconName?: string;
  /** One of the design system's color names, not a hex value. */
  iconColor?: string;
}

export interface StatusTemplate {
  id: string;
  statuses: TemplateStatus[];
}

export interface List {
  id: string;
  workspaceId: string;
  folderId?: string;
  name: string;
  archived: boolean;
  statusTemplateId: string | null;
  iconName?: string;
  iconColor?: string;
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
}

/** `GET /available/all` — the cross-workspace boot bundle; we use a subset. */
export interface AvailableBundle {
  workspaces: Workspace[];
  lists: List[];
  statusTemplates: StatusTemplate[];
  members: Member[];
  tags: Tag[];
}

/** `GET /auth/me` — the authenticated account. */
export interface User {
  id: string;
  username?: string | null;
  email?: string | null;
}

/** `GET /workspaces/:id/tasks/search` — flat, offset-paginated. */
export interface FlatTaskResult {
  items: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  statusId?: string;
  priority?: Priority;
  dueDate?: string;
  allDay?: boolean;
  assigneeId?: string;
}

export type UpdateTaskInput = Partial<{
  title: string;
  statusId: string;
  priority: Priority;
  dueDate: string | null;
  allDay: boolean;
  assigneeId: string | null;
}>;
