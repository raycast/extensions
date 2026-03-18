export type KeepItemContentLead = {
  kind: "image" | "embed";
  url: string;
  alt?: string;
};

export type KeepItemContentMeta = {
  frontmatter?: Record<string, unknown>;
  lead?: KeepItemContentLead;
};

export type KeepItemContent = {
  schemaVersion: 2;
  meta?: KeepItemContentMeta;
};

export type KeepItem = {
  id: string;
  url: string;
  title?: string;
  favicon?: string;
  createdAt: number;
  lastSeenAt: number;
  updatedAt: number;
  status: string;
  timesAdded: number;
  collectionName?: string;
  collectionSlug?: string;
  notes?: string;
  tags?: string[];
  tagSlugs?: string[];
  contentAvailable: boolean;
  contentMarkdown?: string;
  content?: KeepItemContent;
  processedAt?: number;
};

export type KeepItemsResponse = {
  items: KeepItem[];
  limit: number;
  offset: number;
  count: number;
  total?: number;
};

export type KeepIngestResponse = {
  ok: true;
  id: string;
  url: string;
  extracted: boolean;
  sync?: {
    added?: number;
    upserted?: number;
  };
};

export type KeepDeleteResponse = {
  deleted: number;
};

export type KeepPreferences = {
  apiKey: string;
  baseUrl?: string;
};

export type LinkFilter = "all" | "unread" | "read";
