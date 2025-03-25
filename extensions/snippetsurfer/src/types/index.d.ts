export interface SnippetContent {
  title: string?;
  description: string?;
  tags: string[];
  content: string;
  rawMetadata: string;
}

export interface Snippet {
  id: string;
  name: string;
  folder: string;
  content: SnippetContent;
}

export interface State {
  snippets?: Snippet[];
  filteredSnippets?: Snippet[];
  folders?: string[];
  tags?: string[];
  errors?: Error[];
  isLoading: boolean;
  selectedFilter?: string;
  primaryAction?: string;
  paths?: string[];
}
