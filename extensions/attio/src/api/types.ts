import type { components } from "./schema";

/**
 * VERIFIED 2026-08-31 against the live API: every value carries three fields the
 * `output-value` union does NOT declare (absent from all 19 variants). Same class
 * of gap as `web_url`, but wider — a response-validating SDK would reject every
 * value of every record. See spec §4.2 / §14.
 */
type ValueMeta = {
  active_from: string;
  active_until: string | null; // non-null ⇒ historical value
  created_by_actor: { id: string | null; type: string };
};

export type AttributeValue = components["schemas"]["output-value"] & ValueMeta;
export type AttributeType = AttributeValue["attribute_type"];
export type Attribute = components["schemas"]["attribute"];
export type AttioObject = components["schemas"]["object"];
export type Note = components["schemas"]["note"];
export type Task = components["schemas"]["task"];
export type AttioList = components["schemas"]["list"];
export type WorkspaceMember = components["schemas"]["workspace-member"];
export type SelectOption = components["schemas"]["select-option"];
export type StatusDef = components["schemas"]["status"];

export type Envelope<T> = { data: T };
export type Paged<T> = { data: T[] };

/** Records are not a component schema; this is the live shape (spec §14). */
export type AttioRecord = {
  id: { workspace_id: string; object_id: string; record_id: string };
  created_at: string;
  web_url: string;
  values: Record<string, AttributeValue[]>;
};

export type Self = {
  active: boolean;
  scope?: string; // space-separated
  workspace_id?: string;
  workspace_name?: string;
  workspace_slug?: string;
  workspace_logo_url?: string | null;
  authorized_by_workspace_member_id?: string | null;
};

export type Webhook = {
  id: { workspace_id: string; webhook_id: string };
  target_url: string;
  status: "active" | "degraded" | "inactive";
  subscriptions: Array<{ event_type: string; filter: unknown }>;
  created_at: string;
};

/** `secret` is returned ONLY at creation; GET never includes it again — verified live 2026-09-07. */
export type WebhookCreateResponse = Webhook & { secret: string };

/** Verified against scripts/attio-openapi.json POST /v2/webhooks (src/api/webhook-events.test.ts). */
export const WEBHOOK_EVENT_TYPES = [
  "call-recording.created",
  "comment.created",
  "comment.deleted",
  "comment.resolved",
  "comment.unresolved",
  "list-attribute.created",
  "list-attribute.updated",
  "list-entry.created",
  "list-entry.deleted",
  "list-entry.updated",
  "list.created",
  "list.deleted",
  "list.updated",
  "note-content.updated",
  "note.created",
  "note.deleted",
  "note.updated",
  "object-attribute.created",
  "object-attribute.updated",
  "record.created",
  "record.deleted",
  "record.merged",
  "record.updated",
  "task.created",
  "task.deleted",
  "task.updated",
  "workspace-member.created",
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

/** POST/PATCH /v2/webhooks body. New subscriptions send filter:null (no filter
 * UI in scope), but PATCH round-trips existing subscriptions verbatim so
 * filters created in the web app survive edits — hence `unknown`. */
export type WebhookCreateBody = {
  target_url: string;
  subscriptions: Array<{ event_type: WebhookEventType; filter: unknown }>;
};

/**
 * Tasks are asymmetric (verified live, spec §4.2): reads return
 * `target_object_id` (UUID); writes take `target_object` (slug or id).
 */
export type TaskLinkRead = { target_object_id: string; target_record_id: string };
export type TaskLinkWrite = { target_object: string; target_record_id: string };

export type TaskCreateBody = {
  content: string; // maxLength 2000
  format: "plaintext"; // the only value Attio accepts
  deadline_at: string | null;
  is_completed: boolean;
  linked_records: TaskLinkWrite[];
  assignees: Array<{ referenced_actor_type: "workspace-member"; referenced_actor_id: string }>;
};

/** PATCH /v2/tasks/{id} — `content` is NOT updatable. */
export type TaskUpdateBody = Partial<Omit<TaskCreateBody, "content" | "format">>;

/**
 * Record edits go through PUT, not PATCH: PATCH *appends* to multiselect
 * attributes, PUT overwrites them. Both touch only the attributes provided,
 * so PUT with changed-keys-only is the correct "replace these fields" edit.
 */
export type RecordUpdateBody = { data: { values: Record<string, unknown> } };

export type ObjectCreateBody = { data: { api_slug: string; singular_noun: string; plural_noun: string } };

export type RecordsQueryBody = {
  limit: number;
  offset: number;
  sorts?: Array<{ direction: "asc" | "desc"; attribute: string; field?: string }>;
  filter?: Record<string, unknown>;
};

/** Live-verified shape (spec §14): extra fields beyond these are untyped. */
export type SearchHit = {
  id: { workspace_id: string; object_id: string; record_id: string };
  record_text: string;
  record_image: string | null;
  object_slug: string;
};
