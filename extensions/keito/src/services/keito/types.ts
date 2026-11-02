// Raw Keito API v2 shapes. Every field is optional or nullable because full-access and
// personal-sync responses differ, and the public docs do not publish a complete schema.

export type KeitoId = string;

export interface RawIdName {
  id?: KeitoId | number | null;
  name?: string | null;
}

export interface RawPaginationLinks {
  first?: string | null;
  next?: string | null;
  previous?: string | null;
  last?: string | null;
}

export interface RawPaginationEnvelope {
  page?: number;
  per_page?: number;
  total_pages?: number;
  total_entries?: number;
  links?: RawPaginationLinks;
}

export interface RawCurrentUser {
  id?: KeitoId | number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  roles?: string[];
  user_type?: string;
  is_active?: boolean;
  // Full-access responses include workspace settings on company (not in the public docs; observed live).
  company?: {
    id?: KeitoId | number;
    name?: string | null;
    timezone?: string | null;
    manual_entry_format?: string | null;
    require_notes?: boolean;
    allow_past_timer_starts?: boolean;
    time_rounding_description?: string | null;
  } | null;
  // Personal read-only sync keys return read capabilities and no company; full-access keys return
  // capabilities such as can_track_time alongside the company.
  capabilities?: Record<string, boolean>;
}

export interface RawProject {
  id?: KeitoId | number;
  name?: string | null;
  code?: string | null;
  is_active?: boolean;
  client?: RawIdName | null;
  client_id?: KeitoId | number | null;
  can_track_time?: boolean;
}

export interface RawTask {
  id?: KeitoId | number;
  name?: string | null;
  is_active?: boolean;
  billable_by_default?: boolean;
}

export interface RawExternalReference {
  id?: string;
  permalink?: string | null;
  service?: string | null;
  service_name?: string | null;
  service_icon_url?: string | null;
  group_id?: string | null;
  account_id?: string | null;
  display_name?: string | null;
  group_name?: string | null;
  parent_id?: string | null;
}

export type ApprovalStatus = "unsubmitted" | "submitted" | "approved" | "rejected";

export interface RawTimeEntry {
  id?: KeitoId | number;
  user_id?: KeitoId | number | null;
  project_id?: KeitoId | number | null;
  task_id?: KeitoId | number | null;
  client_id?: KeitoId | number | null;
  user?: RawIdName | null;
  project?: (RawIdName & { code?: string | null }) | null;
  task?: RawIdName | null;
  client?: RawIdName | null;
  spent_date?: string;
  hours?: number | string | null;
  rounded_hours?: number | string | null;
  duration_seconds?: number | null;
  notes?: string | null;
  is_running?: boolean;
  timer_started_at?: string | null;
  started_time?: string | null;
  ended_time?: string | null;
  is_locked?: boolean;
  locked_reason?: string | null;
  is_closed?: boolean;
  is_billed?: boolean;
  billable?: boolean;
  approval_status?: ApprovalStatus | string | null;
  source?: string | null;
  external_reference?: RawExternalReference | null;
  created_at?: string;
  updated_at?: string;
}

// Normalized domain shapes used by the UI. IDs are always strings.

export type CredentialType = "full_access" | "read_only_sync" | "oauth";

export interface KeitoIdentity {
  userId: KeitoId;
  name: string;
  email?: string;
  roles: string[];
  userType?: string;
  companyId: KeitoId;
  companyName?: string;
  credentialType: CredentialType;
  features: string[];
  settings: WorkspaceSettings;
}

export interface WorkspaceSettings {
  /** IANA timezone used for spent dates and HH:mm times. */
  timezone?: string;
  /** Keito's manual entry format, e.g. "duration". */
  manualEntryFormat?: string;
  requireNotes: boolean;
  /** undefined when Keito did not report the setting. */
  allowPastTimerStarts?: boolean;
  timeRoundingDescription?: string;
}

export interface Project {
  id: KeitoId;
  name: string;
  code?: string;
  clientId?: KeitoId;
  clientName?: string;
}

export interface Task {
  id: KeitoId;
  name: string;
}

export interface ExternalReference {
  id: string;
  permalink?: string;
  service?: string;
  serviceName?: string;
  serviceIconUrl?: string;
  groupId?: string;
  accountId?: string;
  displayName?: string;
  groupName?: string;
  parentId?: string;
}

export interface TimeEntry {
  id: KeitoId;
  userId?: KeitoId;
  projectId: KeitoId;
  projectName: string;
  projectCode?: string;
  taskId: KeitoId;
  taskName: string;
  clientId?: KeitoId;
  clientName?: string;
  spentDate: string;
  hours: number;
  durationSeconds?: number;
  notes: string;
  isRunning: boolean;
  timerStartedAt?: string;
  startedTime?: string;
  endedTime?: string;
  isLocked: boolean;
  lockedReason?: string;
  isClosed: boolean;
  isBilled: boolean;
  billable?: boolean;
  approvalStatus?: ApprovalStatus;
  source?: string;
  externalReference?: ExternalReference;
  createdAt?: string;
  updatedAt?: string;
}

// Request bodies. Keito rejects unknown properties, so only documented fields appear here.

export interface ExternalReferenceInput {
  id: string;
  permalink?: string;
  service?: string;
  service_name?: string;
  group_id?: string;
  account_id?: string;
  display_name?: string;
  group_name?: string;
  parent_id?: string;
}

export interface TimeEntryCreateBody {
  project_id: KeitoId;
  task_id: KeitoId;
  spent_date: string;
  hours?: number;
  is_running?: boolean;
  replace_running?: boolean;
  started_time?: string;
  ended_time?: string;
  notes?: string;
  source?: "api";
  external_reference?: ExternalReferenceInput;
}

export interface TimeEntryUpdateBody {
  project_id?: KeitoId;
  task_id?: KeitoId;
  spent_date?: string;
  hours?: number;
  started_time?: string;
  ended_time?: string;
  notes?: string;
}
