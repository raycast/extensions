import { request } from "./client";
import type {
  AttioList,
  AttioObject,
  AttioRecord,
  Attribute,
  Envelope,
  Note,
  ObjectCreateBody,
  Paged,
  RecordsQueryBody,
  RecordUpdateBody,
  SearchHit,
  SelectOption,
  Self,
  StatusDef,
  Task,
  TaskCreateBody,
  TaskUpdateBody,
  Webhook,
  WebhookCreateBody,
  WebhookCreateResponse,
  WorkspaceMember,
} from "./types";

export const getSelf = () => request<Self>("/v2/self");

export const listObjects = () => request<Paged<AttioObject>>("/v2/objects");
export const createObject = (body: ObjectCreateBody) =>
  request<Envelope<AttioObject>>("/v2/objects", { method: "POST", body: JSON.stringify(body) });

export const listAttributes = async (object: string): Promise<Paged<Attribute>> => {
  // Offset-paginate: an object can carry more than one page of attributes, and a
  // truncated schema silently drops fields from details, exports, and edit forms.
  const data: Attribute[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await request<Paged<Attribute>>(`/v2/objects/${object}/attributes?limit=100&offset=${offset}`);
    data.push(...page.data);
    if (page.data.length < 100) return { data };
  }
};
export const listAttributeOptions = (object: string, attribute: string) =>
  request<Paged<SelectOption>>(`/v2/objects/${object}/attributes/${attribute}/options`);
export const listAttributeStatuses = (object: string, attribute: string) =>
  request<Paged<StatusDef>>(`/v2/objects/${object}/attributes/${attribute}/statuses`);

export const queryRecords = (object: string, body: RecordsQueryBody) =>
  request<Paged<AttioRecord>>(`/v2/objects/${object}/records/query`, { method: "POST", body: JSON.stringify(body) });
export const searchRecords = (query: string, objects: string[]) =>
  request<Paged<SearchHit>>("/v2/objects/records/search", {
    method: "POST",
    body: JSON.stringify({ query, objects, request_as: { type: "workspace" }, limit: 25 }),
  });
export const getRecord = (object: string, recordId: string) =>
  request<Envelope<AttioRecord>>(`/v2/objects/${object}/records/${recordId}`);
/** PUT, not PATCH: PATCH appends to multiselects; PUT overwrites (types.ts). */
export const updateRecord = (object: string, recordId: string, body: RecordUpdateBody) =>
  request<Envelope<AttioRecord>>(`/v2/objects/${object}/records/${recordId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteRecord = (object: string, record_id: string) =>
  request<unknown>(`/v2/objects/${object}/records/${record_id}`, { method: "DELETE" });

export const listLists = () => request<Paged<AttioList>>("/v2/lists");
export const listListViews = (list_id: string) =>
  request<Paged<{ id: { workspace_id: string; list_id: string; view_id: string }; title: string; created_at: string }>>(
    `/v2/lists/${list_id}/views`,
  );

export const listNotes = (opts: { limit: number; offset: number }) =>
  request<Paged<Note>>(`/v2/notes?limit=${opts.limit}&offset=${opts.offset}`);
export const updateNote = (note_id: string, body: { title?: string; format?: "markdown"; content?: string }) =>
  request<Envelope<Note>>(`/v2/notes/${note_id}`, { method: "PATCH", body: JSON.stringify({ data: body }) });

export const listTasks = async (opts: {
  limit: number;
  offset: number;
  sort?: "created_at:asc" | "created_at:desc";
}) => {
  const sort = opts.sort ? `&sort=${opts.sort}` : "";
  const res = await request<Paged<Task>>(`/v2/tasks?limit=${opts.limit}&offset=${opts.offset}${sort}`);
  // Live API omits these arrays on some tasks even though the schema requires
  // them (verified from a production crash 2026-09-01); normalize once here so
  // no consumer ever guards.
  return {
    data: res.data.map((t) => ({ ...t, linked_records: t.linked_records ?? [], assignees: t.assignees ?? [] })),
  };
};
export const createTask = (body: TaskCreateBody) =>
  request<Envelope<Task>>("/v2/tasks", { method: "POST", body: JSON.stringify({ data: body }) });
export const updateTask = (taskId: string, body: TaskUpdateBody) =>
  request<Envelope<Task>>(`/v2/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ data: body }) });
export const deleteTask = (taskId: string) => request<unknown>(`/v2/tasks/${taskId}`, { method: "DELETE" });

export const listMembers = () => request<Paged<WorkspaceMember>>("/v2/workspace_members");

export const listWebhooks = () => request<Paged<Webhook>>("/v2/webhooks?limit=100");
export const createWebhook = (body: WebhookCreateBody) =>
  request<Envelope<WebhookCreateResponse>>("/v2/webhooks", { method: "POST", body: JSON.stringify({ data: body }) });
export const updateWebhook = (webhook_id: string, body: Partial<WebhookCreateBody>) =>
  request<Envelope<Webhook>>(`/v2/webhooks/${webhook_id}`, { method: "PATCH", body: JSON.stringify({ data: body }) });
export const deleteWebhook = (webhook_id: string) =>
  request<unknown>(`/v2/webhooks/${webhook_id}`, { method: "DELETE" });
