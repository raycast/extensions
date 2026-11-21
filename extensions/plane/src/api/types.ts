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

export type RawCycle = {
  id: string;
  name: string;
  description?: string;
  start_date?: string | null;
  end_date?: string | null;
  project?: string;
  total_issues?: number;
  completed_issues?: number;
  cancelled_issues?: number;
  started_issues?: number;
  unstarted_issues?: number;
  backlog_issues?: number;
};

/** IntakeIssue.status values, verified in plane/db/models/intake.py at v1.3.1. */
export const IntakeStatus = {
  Pending: -2,
  Rejected: -1,
  Snoozed: 0,
  Accepted: 1,
  Duplicate: 2,
} as const;
export type IntakeStatus = (typeof IntakeStatus)[keyof typeof IntakeStatus];

export type RawIntakeItem = {
  id: string;
  issue?: string;
  status?: IntakeStatus;
  snoozed_till?: string | null;
  duplicate_to?: string | null;
  source?: string | null;
  created_at?: string;
  issue_detail?: {
    id: string;
    name: string;
    sequence_id?: number;
    priority?: PriorityEnum;
    description_html?: string;
    created_at?: string;
    state?: RawStateLite | null;
  };
};

export type RawPage = {
  id: string;
  name?: string | null;
  description_html?: string | null;
  description_stripped?: string | null;
  created_at?: string;
  updated_at?: string;
  owned_by?: string;
  projects?: string[];
  archived_at?: string | null;
  is_locked?: boolean;
  access?: number;
};

/**
 * A work item row from Plane API v2. Relations are ids (`state_id`, `assignee_ids`, `label_ids`); `?expand=`
 * adds objects next to them without replacing the ids (developers.plane.so/api-reference/v2/expanding-relations).
 */
export type V2WorkItem = {
  id: string;
  name: string;
  /** Human key, e.g. `ENG-142`. */
  identifier?: string;
  sequence_id: number;
  project_id: string;
  state_id?: string | null;
  priority?: PriorityEnum;
  assignee_ids?: string[];
  label_ids?: string[];
  created_by_id?: string | null;
  created_at?: string;
  updated_at?: string;
  start_date?: string | null;
  target_date?: string | null;
  description_html?: string;
  /** With `?expand=state`. */
  state?: RawStateLite | null;
};

/** A page row from the v2 workspace or project pages list. */
export type V2Page = {
  id: string;
  name?: string | null;
  description_html?: string | null;
  description_stripped?: string | null;
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
  is_locked?: boolean;
  access?: number;
  owned_by_id?: string | null;
};

/**
 * Normalized work item used by list rows, the menu bar, and AI tools.
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
