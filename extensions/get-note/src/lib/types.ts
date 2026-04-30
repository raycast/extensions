export type CredentialSource = "preferences" | "local-storage";

export type GetNoteCredentials = {
  apiKey: string;
  clientId: string;
  expiresAt?: number;
  source: CredentialSource;
};

export type StoredGetNoteSession = {
  apiKey: string;
  clientId: string;
  expiresAt?: number;
};

export type GetNoteApiErrorPayload = {
  code?: number;
  message?: string;
  reason?: string;
};

export type GetNoteEnvelope<T> = {
  success: boolean;
  data: T;
  error?: GetNoteApiErrorPayload | null;
  request_id?: string;
};

export type DeviceAuthorizationSession = {
  code: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
};

export type PendingDeviceAuthorizationSession = DeviceAuthorizationSession & {
  createdAt: number;
};

export type NoteTag = {
  id: string;
  name: string;
  type: "ai" | "manual" | "system" | string;
};

export type NoteSummary = {
  id: string;
  note_id: string;
  title: string;
  content: string;
  ref_content?: string;
  note_type: string;
  source?: string;
  tags: NoteTag[];
  children_count?: number;
  topics?: Array<{ topic_id?: string; name?: string }>;
  is_child_note?: boolean;
  created_at: string;
  updated_at?: string;
};

export type WebPageDetail = {
  url?: string;
  content?: string;
  excerpt?: string;
};

export type NoteDetail = NoteSummary & {
  note_id: string;
  attachments?: Array<{ type?: string; url?: string; original_url?: string }>;
  children_ids?: string[];
  web_page?: WebPageDetail;
  audio?: {
    original?: string;
    play_url?: string;
    duration?: number;
  };
};

export type RecallResult = {
  note_id?: string;
  note_type: string;
  title: string;
  content: string;
  created_at?: string;
  page_no?: number;
};

export type KnowledgeRecallResult = {
  note_id?: string;
  note_type: string;
  title: string;
  content: string;
  created_at?: string;
  page_no?: number;
};

export type NotesPage = {
  notes: NoteSummary[];
  has_more: boolean;
  next_cursor?: string;
  total: number;
};

export type SaveLinkTask = {
  task_id: string;
  url: string;
};

export type TaskProgress = {
  status: "pending" | "processing" | "success" | "failed";
  note_id?: string;
  error_msg?: string;
};

export type KnowledgeBase = {
  topic_id: string;
  name: string;
  description?: string;
  cover?: string;
  created_at?: string;
  updated_at?: string;
  stats?: {
    note_count?: number;
    file_count?: number;
    blogger_count?: number;
    live_count?: number;
  };
};

export type KnowledgeBaseNote = {
  note_id: string;
  title: string;
  content: string;
  note_type: string;
  tags?: NoteTag[];
  created_at?: string;
  edit_time?: string;
};

export type KnowledgeBaseNotesPage = {
  notes: KnowledgeBaseNote[];
  has_more: boolean;
};
