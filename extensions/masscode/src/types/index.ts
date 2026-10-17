interface SnippetBase {
  id: number;
  name: string;
  description: string | null;
  tags: {
    id: number;
    name: string;
  }[];
  folder: {
    id: number;
    name: string;
  } | null;
  isFavorites: number;
  isDeleted: number;
  createdAt: number;
  updatedAt: number;
}

// GET /snippets returns fragments without values
export interface SnippetListEntry extends SnippetBase {
  contents: {
    id: number;
    label: string;
    language: string;
  }[];
}

export interface Snippet extends SnippetBase {
  contents: {
    id: number;
    label: string;
    value: string | null;
    language: string;
  }[];
}

export interface ListItem {
  // Fragment ids are unique only within a snippet
  id: string;
  snippetId: number;
  contentId: number;
  name: string;
  snippetName: string;
  description: string;
  detail: string;
  language: string;
  // Present only in mock data, real values are loaded on selection
  value?: string;
}
