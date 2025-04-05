export interface Preferences {
  apiKey: string;
}

export interface Essay {
  id: string;
  content: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface NoteFolder {
  id: string;
  name: string;
  created_at: Date;
}

export interface NoteComment {
  id: number;
  note_id: string;
  content: string;
  created_at: Date;
}

export interface Note {
  id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  folder_id?: string;
  folder?: Partial<NoteFolder> | null;
  comments?: NoteComment[];
}
