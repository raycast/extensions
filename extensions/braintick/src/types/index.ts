export interface Project {
  id: string;
  name: string;
  color: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  priority: string;
  due_date?: string | null;
  project_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sync_with_huly: boolean;
  huly_issue_id?: string | null;
  huly_project_id?: string | null;
  huly_workspace_id?: string | null;
  last_synced_at?: string | null;
  sync_status?: string | null;
  sync_error?: string | null;
  owner_id: string;
}

export interface VoiceNote {
  id: string;
  uri: string;
  description?: string | null;
  transcription?: string | null;
  transcription_error?: string | null;
  summary?: string | null;
  summary_error?: string | null;
  is_transcribing: boolean;
  is_summarizing: boolean;
  timer_id?: string | null;
  project_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  owner_id: string;
}

export interface VideoNote {
  id: string;
  uri: string;
  description?: string | null;
  transcript?: string | null;
  duration: number;
  timer_id?: string | null;
  project_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  owner_id: string;
}

export interface Timer {
  id: string;
  start_time?: string | null;
  end_time?: string | null;
  project_id?: string | null;
  project?: Project | null;
  task_id?: string | null;
  task?: Task | null;
  description?: string | null;
  voice_notes?: VoiceNote[];
  video_notes?: VideoNote[];
  is_active: boolean;
  is_billable: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  owner_id: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  completed?: boolean;
  priority: string;
  due_date?: string | null;
  project_id?: string;
  sync_with_huly?: boolean;
  huly_issue_id?: string;
  huly_project_id?: string;
  huly_workspace_id?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  completed?: boolean;
  priority?: string;
  due_date?: string | null;
  project_id?: string | null;
  sync_with_huly?: boolean;
  huly_issue_id?: string | null;
  huly_project_id?: string | null;
  huly_workspace_id?: string | null;
  last_synced_at?: string | null;
  sync_status?: string | null;
  sync_error?: string | null;
}

export interface CreateProjectInput {
  name: string;
  color: string;
}

export interface UpdateProjectInput {
  name?: string;
  color?: string;
}

export interface CreateTimerInput {
  start_time?: string | null;
  end_time?: string | null;
  project_id: string;
  task_id?: string;
  description?: string;
  voice_note_ids?: string[];
  video_note_ids?: string[];
  is_active?: boolean;
  is_billable?: boolean;
}

export interface UpdateTimerInput {
  start_time?: string | null;
  end_time?: string | null;
  project_id?: string | null;
  task_id?: string | null;
  description?: string | null;
  is_active?: boolean;
  is_billable?: boolean;
}
