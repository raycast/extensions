export type Id<Table extends string> = string & { readonly __table?: Table };

export interface Note {
  _id: Id<"notes">;
  _creationTime: number;
  title: string;
  content?: string;
  tags: string[];
  source: "web" | "raycast";
  summary?: string;
  userId: string;
  updatedAt: number;
  isLocked?: boolean;
  isPinned?: boolean;
  isE2E?: boolean;
  deletedAt?: number;
}

export type NoteId = string;

export interface Folder {
  _id: Id<"folders">;
  _creationTime: number;
  name: string;
  description?: string;
  color?: string;
  userId: string;
}

export interface AskAiCitation {
  sentence: number;
  sources: number[];
}

export interface AskAiMatch {
  noteId: string;
  title: string;
  snippet: string;
  score: number;
  isLocked: boolean;
  sourceIndex: number;
}

export interface AskAiResponse {
  answer: string;
  citations: AskAiCitation[];
  matches: AskAiMatch[];
}
