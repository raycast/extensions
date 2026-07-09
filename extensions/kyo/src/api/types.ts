/**
 * Types for the Kyo REST API v1 resources.
 * Field sets mirror the "Writable fields" and response shapes documented at
 * https://www.trykyo.com/docs/api  — server-owned columns (id, created_at,
 * workspace, creator) come back on reads but can never be supplied on writes.
 */

export interface KyoBase {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/** PATCH body: any writable field, where null explicitly clears the column. */
export type Patch<T> = { [K in keyof T]?: T[K] | null };

export interface Deal extends KyoBase {
  name: string;
  pipeline_id?: string;
  pipeline_stage_id?: string;
  owner_id?: string;
  value?: number;
  confidence?: number;
  website?: string;
  instagram?: string;
  twitter?: string;
  notes?: string;
  company_id?: string;
}

export interface Person extends KyoBase {
  name: string;
  company?: string;
  company_id?: string;
  phone?: string;
  email?: string;
  position?: string;
  linkedin_url?: string;
  twitter_url?: string;
}

export interface Company extends KyoBase {
  name: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  industry?: string;
  size?: string;
  notes?: string;
}

export interface Task extends KyoBase {
  name: string;
  space_id?: string;
  project_id?: string;
  assignee_id?: string;
  due_date?: string;
  start_date?: string;
  priority?: number; // 0-4
  completed?: boolean;
  description?: string;
  is_private?: boolean;
  stage_id?: string;
}

export interface DealTask extends KyoBase {
  deal_id: string;
  name: string;
  assignee_id?: string;
  due_date?: string;
  priority?: number;
  completed?: boolean;
  description?: string;
  is_private?: boolean;
}

export interface Pipeline extends KyoBase {
  name: string;
  position?: number;
}

export type MetricTag =
  "messages_sent" | "responses" | "positive_responses" | "deals_closed";

export interface PipelineStage extends KyoBase {
  pipeline_id: string;
  name: string;
  position?: number;
  metric_tag?: MetricTag;
}

export interface Label extends KyoBase {
  name: string;
}

export type CommentEntityType = "deal" | "task";

export interface Comment extends KyoBase {
  entity_type: CommentEntityType;
  entity_id: string;
  content: string;
}

export interface Space extends KyoBase {
  name: string;
  image_url?: string;
  is_default?: boolean;
  status?: string;
  notes?: string;
}

export interface Project extends KyoBase {
  space_id: string;
  name: string;
  position?: number;
  start_date?: string;
  end_date?: string;
  kanban_enabled?: boolean;
}

export interface DealPerson extends KyoBase {
  deal_id: string;
  person_id: string;
  is_primary?: boolean;
}

export interface DealLabel extends KyoBase {
  deal_id: string;
  label_id: string;
}

// activity_logs rows: `action` is a preformatted human-readable sentence
// (e.g. "Jane moved deal to Won"); there is no separate description column.
export interface Activity extends KyoBase {
  entity_type?: string;
  entity_id?: string;
  action?: string;
  user_id?: string;
}

export interface Credits {
  balance?: number;
  [key: string]: unknown;
}

// Priority labels for tasks/deal tasks (0-4).
export const PRIORITY_LABELS: Record<number, string> = {
  0: "None",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};
