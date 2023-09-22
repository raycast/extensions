// Define an interface for a SnippetItem
export interface SnippetItem {
  id: string; // Unique identifier for the snippet
  UUID: Uint8Array; // Universally Unique Identifier for the snippet
  title?: string; // Title of the snippet
  modifiedAt?: Date; // Date when the snippet was last modified (optional)
  folder?: string; // Folder where the snippet is located
  snippet?: string; // Summary or excerpt of the snippet content
  code?: string;
  language?: string; // Full code content of the snippet
}

// Define an interface for a FolderItem
export interface FolderItem {
  id: string; // Unique identifier for the folder
  UUID: Uint8Array; // Universally Unique Identifier for the folder
  title: string; // Title of the folder
}
