export type SnippetKind = "plain" | "rich" | "applescript" | "shell" | "unknown";

export interface SourceSnippet {
  id: string;
  group: string;
  label: string;
  abbreviation: string;
  text: string;
  kind: SnippetKind;
}

export interface Library {
  snippets: SourceSnippet[];
  suggestedCount: number;
}

export interface RaycastSnippet {
  name: string;
  text: string;
  keyword?: string;
}

export interface PreviewSnippet {
  id: string;
  group: string;
  kind: SnippetKind;
  snippet: RaycastSnippet;
  warnings: string[];
}

export interface Conversion {
  snippets: PreviewSnippet[];
  suggestedCount: number;
  duplicateCount: number;
  emptyCount: number;
}
