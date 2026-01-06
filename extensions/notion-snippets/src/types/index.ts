// Lightweight index - only essential metadata for listing
export interface SnippetIndex {
  id: string;
  name: string;
  contentPreview?: string; // First 500 chars for preview
  trigger?: string;
  description?: string;
  databaseId?: string;
  preview?: string;
  usageCount?: number;
  lastUsed?: string;
  url?: string;
  type?: string;
  typeColor?: string;
  status?: string;
  statusColor?: string;
  contentLength?: number; // Store length to know if we need to load full content
}

// Full snippet with complete content
export interface Snippet extends SnippetIndex {
  content: string; // Full content - loaded on demand
}

export interface DatabaseMetadata {
  id: string;
  title: string;
  icon?: string;
}

export interface Preferences {
  notionToken: string;
  databaseIds: string;
  showMetadata: boolean;
}
