// Mirrors public API v1 response shapes. IDs are opaque LPID strings.

export interface Project {
  object: "project";
  id: string;
  name: string;
}

export interface Tag {
  object: "tag";
  id: string;
  name: string;
}

export interface ActiveEvent {
  id: string;
  started_at: string;
}

export interface Timer {
  object: "timer";
  id: string;
  title: string;
  started_at: string | null;
  ended_at: string | null;
  timezone: string | null;
  completed_duration_seconds: number;
  created_at: string;
  updated_at: string;
  active: boolean;
  notes: string | null;
  project: Project | null;
  tags: Tag[];
  active_event: ActiveEvent | null;
}

export interface Context {
  object: "context";
  id: string;
  started_at: string;
  stopped_at: string | null;
  timezone: string | null;
  completed_duration_seconds: number;
  display_label: string;
  project: Project | null;
  tags: Tag[];
  running: boolean;
}

export interface TodayStats {
  completed_timer_duration_seconds: number | null;
  completed_context_duration_seconds: number | null;
}

export interface Today {
  timers: Timer[];
  active_context: Context | null;
  stats: TodayStats | null;
}

export interface CreateTimerInput {
  title: string;
  project_id?: string;
  project_name?: string;
  tag_ids?: string[];
  tag_names?: string[];
  notes?: string;
}

export interface CreateContextInput {
  project_id?: string;
  project_name?: string;
  tag_ids?: string[];
  tag_names?: string[];
}
