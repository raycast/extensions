export interface Document {
  id: string;
  title: string;
  tags: string[];
  filename: string;
  shortcut?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentIndex {
  documents: Document[];
  version: number;
}

export interface SearchResult {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface ParsedShortcut {
  prefix: string;
  searchTerm: string;
}
