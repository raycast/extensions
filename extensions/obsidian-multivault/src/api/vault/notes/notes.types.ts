export type Note = {
  title: string;
  path: string;
  lastModified: Date;
  tags: string[];
  content: string; // Lazily loaded - may be empty string initially
  bookmarked: boolean;
};

export type NoteMetadata = {
  title: string;
  path: string;
  lastModified: Date;
  tags: string[];
  bookmarked: boolean;
};

export type CreateNoteParams = {
  path: string;
  name: string;
  content: string;
  tags: string[];
};

export interface CodeBlock {
  language: string;
  code: string;
}
