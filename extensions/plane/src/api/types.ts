import type { PriorityEnum } from "@makeplane/plane-node-sdk";

/**
 * Raw (snake_case) shapes returned by the Plane v1 REST API.
 * Used by the `fetch` helpers in `request.ts` where SDK 0.1.3 lacks an endpoint
 * or drops fields we need (e.g. `assignees`/`labels` on work items).
 */

export type RawStateLite = {
  id: string;
  name: string;
  color: string;
  group?: string;
};

export type RawUserLite = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  avatar?: string;
  avatar_url?: string | null;
  display_name?: string;
};

export type RawLabelLite = {
  id: string;
  name: string;
  color?: string;
};

export type RawWorkItem = {
  id: string;
  name: string;
  sequence_id: number;
  project: string;
  workspace?: string;
  state?: string | RawStateLite | null;
  priority?: PriorityEnum;
  assignees?: (string | RawUserLite)[];
  labels?: (string | RawLabelLite)[];
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  start_date?: string | null;
  target_date?: string | null;
  completed_at?: string | null;
  description_html?: string;
  parent?: string | null;
};

export type RawPaginated<T> = {
  results: T[];
  next_cursor?: string;
  next_page_results?: boolean;
  total_results?: number;
  total_count?: number;
};

export type RawComment = {
  id: string;
  comment_html?: string;
  created_at?: string;
  updated_at?: string;
  edited_at?: string | null;
  actor?: string | RawUserLite | null;
  created_by?: string | null;
  access?: string;
};

export type RawActivity = {
  id: string;
  field?: string | null;
  verb?: string;
  old_value?: string | null;
  new_value?: string | null;
  old_identifier?: string | null;
  new_identifier?: string | null;
  created_at?: string;
};

/**
 * Normalized work item used by list rows and the menu bar.
 * Dates are ISO strings so the object survives `useCachedPromise` JSON caching.
 */
export type WorkItemSummary = {
  id: string;
  name: string;
  projectId: string;
  projectIdentifier: string;
  projectName?: string;
  sequenceId: number | string;
  workspaceSlug: string;
  stateId?: string | null;
  state?: RawStateLite;
  priority?: PriorityEnum;
  assigneeIds?: string[];
  labelIds?: string[];
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string | null;
  targetDate?: string | null;
  descriptionHtml?: string;
};

/** Fields a list can update optimistically. */
export type WorkItemChange = {
  stateId?: string;
  state?: RawStateLite;
  priority?: PriorityEnum;
  assigneeIds?: string[];
};
