/**
 * Lean view models for the extension. The snipper-mcp helper returns full raw rows
 * (including large CloudKit sync blobs); we project to only what the UI needs.
 */

/** Raw row as emitted by snipper-mcp (loose — we only read a subset). */
export interface RawSnippet {
  id: string;
  title?: string;
  content?: string;
  language?: string | null;
  detectedLanguage?: string | null;
  folderId?: string | null;
  workspaceId?: string | null;
  parentId?: string | null;
  isFavorite?: boolean;
  isTrashed?: boolean;
  hubUrl?: string | null;
  hubSnippetId?: string | null;
  sourceHubSnippetId?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  viewedAt?: string | null;
  // ...plus cloudKit* fields we deliberately ignore.
  [key: string]: unknown;
}

export interface Snippet {
  id: string;
  title: string;
  content: string;
  language: string | null;
  folderId: string | null;
  workspaceId: string | null;
  parentId: string | null;
  isFavorite: boolean;
  hubUrl: string | null;
  updatedAt: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string | null;
  sortOrder?: number;
}

export interface Storage {
  id: string;
  workspaceId: string;
  name?: string | null;
  type?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  storageId: string;
  parentId?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  colorHex?: string | null;
}

export interface Language {
  id: string;
  displayName: string;
  aliases: string[];
}

/** Project a raw helper row into the lean Snippet view model. */
export function projectSnippet(raw: RawSnippet): Snippet {
  return {
    id: String(raw.id),
    title: (raw.title ?? "").trim() || "Untitled",
    content: raw.content ?? "",
    language: raw.language ?? raw.detectedLanguage ?? null,
    folderId: raw.folderId ?? null,
    workspaceId: raw.workspaceId ?? null,
    parentId: raw.parentId ?? null,
    isFavorite: Boolean(raw.isFavorite),
    hubUrl: raw.hubUrl ?? null,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? null,
  };
}

/** A community snippet from the public Hub API. */
export interface HubSnippet {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  code: string;
  language: string;
  tags: string[];
  author_username?: string;
  author_display_name?: string | null;
  view_count?: number;
  import_count?: number;
  published_at?: string | null;
}
