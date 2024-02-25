export interface SnippetContent {
  title: string;
  description: string;
  content: string;
  rawMetadata: string;
}

export interface Snippet {
  id: string;
  fullPath: string;
  name: string;
  folder: string;
  content: SnippetContent;
}

export interface State {
  snippets?: Snippet[];
  folders?: string[];
  filteredSnippets?: Snippet[];
  error?: Error;
  isLoading: boolean;
  selectedFolder?: string;
  primaryAction?: string;
}
