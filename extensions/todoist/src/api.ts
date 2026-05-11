// This API is intended to be used for features
// that are not available within Todoist's REST API.
import crypto from "crypto";
import fs from "fs";
import path from "path";

import FormData from "form-data";
import mime from "mime";
import { Dispatch, SetStateAction } from "react";

import { getTodoistApi } from "./helpers/withTodoistApi";

export let sync_token = "*";

export type ProjectViewStyle = "list" | "board";

export type Project = {
  id: string;
  name: string;
  color: string;
  parent_id: string | null;
  child_order: number;
  collapsed: boolean;
  shared: boolean;
  is_deleted: boolean;
  is_archived: boolean;
  is_favorite: boolean;
  sync_id: string | null;
  inbox_project?: boolean;
  team_inbox?: boolean;
  view_style: ProjectViewStyle;
};

export type SyncData = {
  sync_token: string;
  sync_status?: Record<string, "ok" | { error: string }>;
  collaborators: Collaborator[];
  collaborator_states: CollaboratorState[];
  items: Task[];
  labels: Label[];
  filters: Filter[];
  locations: [string, string, string][];
  notes: Comment[];
  reminders: Reminder[];
  projects: Project[];
  sections: Section[];
  temp_id_mapping?: Record<string, string>;
  user: User;
};

export type CachedDataParams = {
  data: SyncData | undefined;
  setData: Dispatch<SetStateAction<SyncData | undefined>>;
};

/** Context for `updateTask` third argument — only invoked after a successful item + optional reminders merge into cache. */
export type TaskUpdateSyncedContext = {
  syncReminders: SyncData["reminders"] | undefined;
  updatedTask: Task | undefined;
};

/**
 * Functional `setState` merge: always reads latest `SyncData`, avoiding stale closures from `setData({ ...data })`.
 */
function mergeIntoCachedData(
  setData: Dispatch<SetStateAction<SyncData | undefined>>,
  merge: (prev: SyncData) => SyncData,
) {
  setData((prev) => (prev ? merge(prev) : prev));
}

class SyncError extends Error {
  code: number;
  tag?: string;

  constructor(message: string, code: number, tag?: string) {
    super(message);
    this.name = "SyncError";
    this.code = code;
    this.tag = tag;
    Object.setPrototypeOf(this, SyncError.prototype);
  }
}

export async function syncRequest(params: Record<string, unknown>) {
  const todoistApi = getTodoistApi();
  const { data } = await todoistApi.post<SyncData>("/sync", params);

  if (data.sync_status) {
    const uuid = Object.keys(data.sync_status)[0];
    if (uuid && data.sync_status[uuid] !== "ok") {
      const error = data.sync_status[uuid] as { error: string; error_code: number; error_tag?: string };
      throw new SyncError(error.error, error.error_code, error.error_tag);
    }
  }

  sync_token = data.sync_token;

  return data;
}

export async function getFilterTasks(query: string) {
  const todoistApi = getTodoistApi();
  try {
    const { data } = await todoistApi.get<{ results: Task[] }>("/tasks/filter", { params: { query } });
    return data.results;
  } catch (error) {
    throw new Error("Error fetching filter tasks:" + error);
  }
}

export async function initialSync() {
  return syncRequest({
    sync_token: "*",
    resource_types: [
      "user",
      "projects",
      "items",
      "sections",
      "labels",
      "filters",
      "collaborators",
      "reminders",
      "locations",
      "notes",
    ],
  });
}

export type AddProjectArgs = {
  name: string;
  color?: string;
  parent_id?: string | null;
  child_order?: number;
  is_favorite?: boolean;
  view_style?: ProjectViewStyle;
};

export async function addProject(args: AddProjectArgs, { setData }: CachedDataParams) {
  const temp_id = crypto.randomUUID();

  const updatedData = await syncRequest({
    sync_token: "*",
    resource_types: ["projects"],
    commands: [
      {
        type: "project_add",
        temp_id,
        uuid: crypto.randomUUID(),
        args,
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    projects: updatedData.projects,
  }));

  return updatedData.temp_id_mapping ? updatedData.temp_id_mapping[temp_id] : null;
}

export type UpdateProjectArgs = {
  id: string;
  name?: string;
  color?: string;
  collapsed?: boolean;
  is_favorite?: boolean;
  view_style?: ProjectViewStyle;
};

export async function updateProject(args: UpdateProjectArgs, { setData }: CachedDataParams) {
  const updatedData = await syncRequest({
    sync_token,
    resource_types: ["projects"],
    commands: [
      {
        type: "project_update",
        uuid: crypto.randomUUID(),
        args,
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    projects: prev.projects.map((p) => (p.id === args.id ? updatedData.projects[0] : p)),
  }));
}

export async function archiveProject(id: string, { setData }: CachedDataParams) {
  await syncRequest({
    sync_token,
    resource_types: ["projects"],
    commands: [
      {
        type: "project_archive",
        uuid: crypto.randomUUID(),
        args: { id },
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    projects: prev.projects.filter((p) => p.id !== id),
  }));
}

export async function deleteProject(id: string, { setData }: CachedDataParams) {
  await syncRequest({
    sync_token,
    resource_types: ["projects"],
    commands: [
      {
        type: "project_delete",
        uuid: crypto.randomUUID(),
        args: { id },
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    projects: prev.projects.filter((p) => p.id !== id),
  }));
}

export type Date = {
  date: string;
  timezone: string | null;
  string: string;
  lang: "en" | "da" | "pl" | "zh" | "ko" | "de" | "pt" | "ja" | "it" | "fr" | "sv" | "ru" | "es" | "nl";
  is_recurring: boolean;
};

export type Deadline = {
  date: string;
  timezone: string | null;
  lang: "en" | "da" | "pl" | "zh" | "ko" | "de" | "pt" | "ja" | "it" | "fr" | "sv" | "ru" | "es" | "nl";
};

export type Task = {
  id: string;
  user_id: string;
  project_id: string;
  content: string;
  description: string;
  due: Date | null;
  deadline: Deadline | null;
  priority: number;
  parent_id: string | null;
  child_order: number;
  section_id: string | null;
  day_order: number;
  collapsed: boolean;
  labels: string[];
  filters: string[];
  added_by_uid: string | null;
  assigned_by_uid: string;
  responsible_uid: string | null;
  checked: boolean;
  is_deleted: boolean;
  sync_id: string | null;
  completed_at: string | null;
  added_at: string;
};

type QuickAddTaskArgs = {
  text: string;
  note?: string;
  reminder?: string;
  auto_reminder?: boolean;
};

export async function quickAddTask(args: QuickAddTaskArgs) {
  const todoistApi = getTodoistApi();
  const { data } = await todoistApi.post<Task>("/tasks/quick", args);
  return data;
}

export type DateOrString = { date: string; string?: string } | { string: string; date?: string };

export type AddTaskArgs = {
  content: string;
  description?: string;
  project_id?: string;
  due?: DateOrString;
  deadline?: DateOrString;
  duration?: {
    unit: "minute" | "day";
    amount: number;
  };
  priority?: number;
  parent_id?: string | null;
  child_order?: number;
  section_id?: string | null;
  day_order?: number;
  collapsed?: boolean;
  labels?: string[];
  assigned_by_uid?: string;
  responsible_uid?: string | null;
  auto_reminder?: boolean;
  auto_parse_labels?: boolean;
};

export async function addTask(args: AddTaskArgs, { data, setData }: CachedDataParams) {
  const temp_id = crypto.randomUUID();

  const updatedData = await syncRequest({
    sync_token: "*",
    resource_types: ["items"],
    commands: [
      {
        type: "item_add",
        temp_id,
        uuid: crypto.randomUUID(),
        args,
      },
    ],
  });

  if (data) {
    mergeIntoCachedData(setData, (prev) => ({ ...prev, items: updatedData.items }));
  }

  return { id: updatedData.temp_id_mapping ? updatedData.temp_id_mapping[temp_id] : null };
}

export type UpdateTaskArgs = {
  id: string;
  content?: string;
  description?: string;
  due?: DateOrString;
  deadline?: DateOrString;
  priority?: number;
  collapsed?: boolean;
  labels?: string[];
  assigned_by_uid?: string;
  responsible_uid?: string | null;
  day_order?: number;
};

/**
 * PATCH task via Sync `item_update`. Returns whether the updated item row was merged into cache.
 * Empty `updatedData.items` is treated as a no-op: cache unchanged, `onSynced` not called.
 */
export async function updateTask(
  args: UpdateTaskArgs,
  cachedData?: CachedDataParams,
  onSynced?: (ctx: TaskUpdateSyncedContext) => void,
): Promise<boolean> {
  const updatedData = await syncRequest({
    sync_token,
    resource_types: ["items", "reminders"],
    commands: [
      {
        type: "item_update",
        uuid: crypto.randomUUID(),
        args,
      },
    ],
  });

  const syncReminders = Array.isArray(updatedData.reminders) ? updatedData.reminders : undefined;
  const updatedTask = updatedData.items[0];

  if (!cachedData?.setData || updatedData.items.length === 0) {
    return false;
  }

  mergeIntoCachedData(cachedData.setData, (prev) => ({
    ...prev,
    items: prev.items.map((i) => (i.id === args.id ? updatedData.items[0] : i)),
    ...(syncReminders !== undefined ? { reminders: mergeSyncedReminders(prev.reminders, syncReminders) } : {}),
  }));
  onSynced?.({ syncReminders, updatedTask });
  return true;
}

/** Complete task; merges returned items + reminders so recurring tasks show the next due in cache. */
export async function closeTask(id: string, { setData }: CachedDataParams) {
  const updatedData = await syncRequest({
    sync_token,
    resource_types: ["items", "reminders"],
    commands: [
      {
        type: "item_close",
        uuid: crypto.randomUUID(),
        args: { id },
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => {
    const touched = updatedData.items?.find((i) => i.id === id);
    const items =
      touched && !touched.checked && !touched.is_deleted
        ? prev.items.some((i) => i.id === id)
          ? prev.items.map((i) => (i.id === id ? touched : i))
          : [...prev.items, touched]
        : prev.items.filter((i) => i.id !== id);
    return {
      ...prev,
      ...(Array.isArray(updatedData.reminders)
        ? { reminders: mergeSyncedReminders(prev.reminders, updatedData.reminders) }
        : {}),
      items,
    };
  });
}

export async function deleteTask(id: string, { setData }: CachedDataParams) {
  await syncRequest({
    sync_token,
    resource_types: ["items"],
    commands: [
      {
        type: "item_delete",
        uuid: crypto.randomUUID(),
        args: { id },
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    items: prev.items.filter((i) => i.id !== id),
  }));
}

export type MoveTaskArgs = {
  id: string;
  parent_id?: string;
  section_id?: string;
  project_id?: string;
};

export async function moveTask(args: MoveTaskArgs, { setData }: CachedDataParams) {
  const updatedData = await syncRequest({
    sync_token,
    resource_types: ["items"],
    commands: [
      {
        type: "item_move",
        uuid: crypto.randomUUID(),
        args,
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    items: prev.items.map((i) => (i.id === args.id ? updatedData.items[0] : i)),
  }));
}

export async function uncompleteTask(id: string, { setData }: CachedDataParams) {
  const updatedData = await syncRequest({
    sync_token: "*",
    resource_types: ["items"],
    commands: [
      {
        type: "item_uncomplete",
        uuid: crypto.randomUUID(),
        args: { id },
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    items: updatedData.items,
  }));
}

export type Reminder = {
  id: string;
  notify_uid: string;
  item_id: string;
  type: "relative" | "absolute" | "location";
  due?: Date;
  mm_offset?: number;
  name?: string;
  loc_lat?: string;
  loc_long?: string;
  loc_trigger?: "on_enter" | "on_leave";
  radius?: number;
  is_deleted: number; // 1 for deleted, 0 for not deleted
};

/**
 * Todoist Sync returns incremental `reminders` rows, not the full list. Merge into cache by id
 * (upsert active rows, drop when `is_deleted === 1`). Empty `incoming` leaves `prev` unchanged.
 */
function mergeSyncedReminders(prev: Reminder[], incoming: Reminder[]): Reminder[] {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((r) => [r.id, r]));
  for (const r of incoming) {
    if (r.is_deleted === 1) {
      byId.delete(r.id);
    } else {
      byId.set(r.id, r);
    }
  }
  return [...byId.values()];
}

export type AddReminderArgs = {
  item_id: string;
  type: "relative" | "absolute" | "location";
  notify_uid?: string;
  due?: DateOrString;
  minute_offset?: number;
  name?: string;
  loc_lat?: string;
  loc_long?: string;
  loc_trigger?: "on_enter" | "on_leave";
  radius?: number;
};

export async function addReminder(args: AddReminderArgs, { setData }: CachedDataParams) {
  const temp_id = crypto.randomUUID();

  const updatedData = await syncRequest({
    sync_token: "*",
    resource_types: ["reminders"],
    commands: [
      {
        type: "reminder_add",
        temp_id,
        uuid: crypto.randomUUID(),
        args,
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    // Full sync token: response reminders are the full active set for this resource, so replace the cache.
    reminders: Array.isArray(updatedData.reminders) ? updatedData.reminders : prev.reminders,
  }));

  return updatedData.temp_id_mapping ? updatedData.temp_id_mapping[temp_id] : null;
}

export async function deleteReminder(id: string, { setData }: CachedDataParams) {
  await syncRequest({
    sync_token,
    resource_types: ["reminders"],
    commands: [
      {
        type: "reminder_delete",
        uuid: crypto.randomUUID(),
        args: { id },
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    reminders: prev.reminders.filter((r) => r.id !== id),
  }));
}

export type Label = {
  id: string;
  name: string;
  color: string;
  item_order: number;
  is_deleted: boolean;
  is_favorite: boolean;
};

type AddLabelArgs = {
  name: string;
  color?: string;
  item_order?: number;
  is_favorite?: boolean;
};

export async function addLabel(args: AddLabelArgs, { setData }: CachedDataParams) {
  try {
    const addedData = await syncRequest({
      sync_token,
      resource_types: ["labels"],
      commands: [
        {
          type: "label_add",
          temp_id: crypto.randomUUID(),
          uuid: crypto.randomUUID(),
          args,
        },
      ],
    });

    mergeIntoCachedData(setData, (prev) => ({
      ...prev,
      labels: [...prev.labels, addedData.labels[0]],
    }));
  } catch (err) {
    if (err instanceof SyncError && err.tag === "LABEL_ALREADY_EXISTS") {
      return;
    }
    throw err;
  }
}

type UpdateLabelArgs = {
  id: string;
  name?: string;
  color?: string;
  item_order?: number;
  is_favorite?: boolean;
};

export async function updateLabel(args: UpdateLabelArgs, { setData }: CachedDataParams) {
  const updatedData = await syncRequest({
    sync_token,
    resource_types: ["labels"],
    commands: [
      {
        type: "label_update",
        uuid: crypto.randomUUID(),
        args,
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    labels: prev.labels.map((p) => (p.id === args.id ? updatedData.labels[0] : p)),
  }));
}

export async function deleteLabel(id: string, { setData }: CachedDataParams) {
  await syncRequest({
    sync_token,
    resource_types: ["labels"],
    commands: [
      {
        type: "label_delete",
        uuid: crypto.randomUUID(),
        args: { id },
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    labels: prev.labels.filter((l) => {
      return l.id != id;
    }),
  }));
}

export type Filter = {
  id: string;
  name: string;
  query: string;
  color: string;
  item_order: number;
  is_deleted: boolean;
  is_favorite: boolean;
};

type UpdateFilterArgs = {
  id: string;
  name?: string;
  color?: string;
  item_order?: number;
  is_favorite?: boolean;
};

export async function updateFilter(args: UpdateFilterArgs, { setData }: CachedDataParams) {
  const updatedData = await syncRequest({
    sync_token,
    resource_types: ["filters"],
    commands: [
      {
        type: "filter_update",
        uuid: crypto.randomUUID(),
        args,
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    filters: prev.filters.map((p) => (p.id === args.id ? updatedData.filters[0] : p)),
  }));
}

export async function deleteFilter(id: string, { setData }: CachedDataParams) {
  await syncRequest({
    sync_token,
    resource_types: ["filters"],
    commands: [
      {
        type: "filter_delete",
        uuid: crypto.randomUUID(),
        args: { id },
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    filters: prev.filters.filter((l) => {
      return l.id != id;
    }),
  }));
}

export type Section = {
  id: string;
  name: string;
  project_id: string;
  section_order: number;
  collapsed: boolean;
  sync_id: string | null;
  is_deleted: boolean;
  is_archived: boolean;
  archived_at: string | null;
  added_at: string;
};

export type Comment = {
  id: string;
  posted_uid: string;
  item_id: string;
  content: string;
  file_attachment: File | null;
  uids_to_notify: string[];
  is_deleted: boolean;
  posted_at: string;
  reactions: Record<string, string[]>;
};

type AddCommentArgs = {
  item_id: string;
  content: string;
  file_attachment?: File;
  uids_to_notify?: string[];
};

export async function addComment(args: AddCommentArgs, { setData }: CachedDataParams) {
  const temp_id = crypto.randomUUID();

  const updatedData = await syncRequest({
    sync_token: "*",
    resource_types: ["notes"],
    commands: [
      {
        type: "note_add",
        temp_id,
        uuid: crypto.randomUUID(),
        args,
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    notes: updatedData.notes,
  }));

  return updatedData.temp_id_mapping ? updatedData.temp_id_mapping[temp_id] : null;
}

type UpdateCommentArgs = {
  id: string;
  content: string;
};

export async function updateComment(args: UpdateCommentArgs, { setData }: CachedDataParams) {
  const updatedData = await syncRequest({
    sync_token,
    resource_types: ["notes"],
    commands: [
      {
        type: "note_update",
        uuid: crypto.randomUUID(),
        args,
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    notes: prev.notes.map((c) => (c.id === args.id ? updatedData.notes[0] : c)),
  }));
}

export async function deleteComment(id: string, { setData }: CachedDataParams) {
  await syncRequest({
    sync_token,
    resource_types: ["comments"],
    commands: [
      {
        type: "note_delete",
        uuid: crypto.randomUUID(),
        args: { id },
      },
    ],
  });

  mergeIntoCachedData(setData, (prev) => ({
    ...prev,
    notes: prev.notes.filter((c) => c.id !== id),
  }));
}

export type Collaborator = {
  id: string;
  email: string;
  full_name: string;
  timezone: string;
  image_id?: string;
};

export type CollaboratorState = {
  project_id: string;
  user_id: string;
  state: "active" | "invited";
  is_deleted: boolean;
};

export type User = {
  auto_reminder: number; // -1 if no reminders
  avatar_medium: string;
  daily_goal: number;
  full_name: string;
  id: string;
  is_premium: boolean;
  time_format: number;
  premium_status: "not_premium" | "current_personal_plan" | "active_business_account" | "teams_business_account";
};

export type Event = {
  id: string;
  object_id: string;
  event_date: string;
  event_type: "completed";
  extra_data: {
    content: string;
  };
};

export async function getActivity() {
  const todoistApi = getTodoistApi();
  const { data } = await todoistApi.get<{ results: Event[] }>("/activities", { params: { event_type: "completed" } });

  return data.results;
}

type Day = {
  date: string; // YYYY-MM-DD
  items: { completed: number; id: string }[];
  total_completed: number;
};

export type Stats = {
  days_items: Day[];
};

export async function getProductivityStats() {
  const todoistApi = getTodoistApi();
  const { data } = await todoistApi.get<Stats>("/tasks/completed/stats");
  return data;
}

export type File = {
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  upload_state: "pending" | "completed";
};

export async function uploadFile(filePath: string) {
  const todoistApi = getTodoistApi();

  const name = path.basename(filePath);
  const stream = fs.createReadStream(filePath);
  const { size } = fs.statSync(filePath);
  const mimeType = mime.getType(filePath);

  const formData = new FormData();
  formData.append("file_name", name);
  formData.append("file_size", size.toString());
  formData.append("file_type", mimeType);
  formData.append("file", stream);

  const { data } = await todoistApi.post<File>("/uploads", formData);
  return data;
}

export async function getTask(id: string) {
  const todoistApi = getTodoistApi();
  const { data } = await todoistApi.get<Task>(`/tasks/${id}`);
  return data;
}

export async function getProject(id: string) {
  const todoistApi = getTodoistApi();
  const { data } = await todoistApi.get<Project>(`/projects/${id}`);
  return data;
}
