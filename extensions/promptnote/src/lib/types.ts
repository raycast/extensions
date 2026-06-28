// PromptNote Types for Raycast Extension

export interface Note {
  id: string;
  user_id: string;
  title: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted: boolean;
  deleted_at: string | null;
  archived: boolean;
  archived_at: string | null;
  pinned: boolean;
  pinned_at: string | null;
  // PIN protection fields
  is_protected?: boolean;
  encrypted_content?: EncryptedContent | null;
  protected_at?: string | null;
}

/**
 * Encrypted content structure for protected notes
 */
export interface EncryptedContent {
  iv: string;
  ciphertext: string;
  snippetIds: string[];
}

export interface Snippet {
  id: string;
  note_id: string;
  user_id: string;
  version: number;
  title: string;
  content: string;
  favorite: boolean;
  upvotes: number;
  downvotes: number;
  created_at: string;
  images?: string[]; // Array of image URLs stored in Supabase Storage
}

export interface TagNode {
  name: string;
  fullPath: string;
  count: number;
  archivedCount: number;
  children: Record<string, TagNode>;
  isVirtual: boolean;
}

export interface User {
  id: string;
  email?: string;
}

// Helper type for note with snippet count
export interface NoteWithSnippetCount extends Note {
  snippetCount: number;
  latestSnippet?: Snippet;
}

// Form values for creating/editing notes
export interface NoteFormValues {
  title: string;
  content: string;
  tags: string[];
}

// Form values for creating/editing snippets
export interface SnippetFormValues {
  title: string;
  content: string;
}

// Form values for quick capture
export interface QuickCaptureFormValues {
  content: string;
  noteId: string; // "new" for creating new note, or existing note ID
  noteTitle?: string; // Only used when noteId is "new"
}
