export type CraftConnection = {
  endpoint: string;
  token?: string;
};

export type CraftDocument = {
  id: string;
  title: string;
  lastModifiedAt?: string;
  createdAt?: string;
  clickableLink?: string;
};

export type CraftSearchItem = {
  documentId: string;
  blockIds?: string[];
  markdown?: string;
  lastModifiedAt?: string;
  createdAt?: string;
  blocks?: CraftBlock[];
};

export type CraftBlock = {
  id: string;
  type?: string;
  title?: string;
  markdown?: string;
  content?: CraftBlock[];
};

export type CraftConnectionMetadata = {
  space?: {
    id?: string;
    name?: string;
    timezone?: string;
  };
  urlTemplates?: {
    app?: string;
  };
};

export type CraftDocumentResult = {
  id: string;
  title: string;
  spaceName?: string;
  lastModifiedAt?: string;
  createdAt?: string;
  url?: string;
  matchingTags?: string[];
  snippet?: string;
};

type DocumentsResponse = {
  items?: CraftDocument[];
};

type SearchResponse = {
  items?: CraftSearchItem[];
};

export async function fetchConnectionMetadata(
  connection: CraftConnection,
): Promise<CraftConnectionMetadata> {
  return fetchCraftJson<CraftConnectionMetadata>(connection, "/connection");
}

export async function fetchDocuments(
  connection: CraftConnection,
  options: { location?: string } = {},
): Promise<CraftDocument[]> {
  const params = new URLSearchParams({ fetchMetadata: "true" });

  if (options.location) {
    params.set("location", options.location);
  }

  const data = await fetchCraftJson<DocumentsResponse>(
    connection,
    `/documents?${params.toString()}`,
  );
  return data.items ?? [];
}

export async function fetchActiveDocuments(
  connection: CraftConnection,
): Promise<CraftDocument[]> {
  const [documents, deletedDocuments] = await Promise.all([
    fetchDocuments(connection),
    fetchDocuments(connection, { location: "trash" }),
  ]);
  const deletedIds = new Set(deletedDocuments.map((document) => document.id));

  return documents.filter((document) => !deletedIds.has(document.id));
}

export async function searchDocuments(
  connection: CraftConnection,
  params: URLSearchParams,
): Promise<CraftSearchItem[]> {
  const data = await fetchCraftJson<SearchResponse>(
    connection,
    `/documents/search?${params.toString()}`,
  );
  return data.items ?? [];
}

export function buildCraftUrl(
  document: CraftDocument,
  metadata?: CraftConnectionMetadata,
): string | undefined {
  if (document.clickableLink) {
    return document.clickableLink;
  }

  const template = metadata?.urlTemplates?.app;
  if (!template) {
    return undefined;
  }

  return template
    .replace("{blockId}", document.id)
    .replace("{documentId}", document.id);
}

export function extractTags(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  const tags = new Set<string>();
  const tagPattern = /(^|[^\w/.-])#([A-Za-z0-9][A-Za-z0-9_/-]*)/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(value)) !== null) {
    tags.add(match[2]);
  }

  return [...tags];
}

export function collectMarkdown(item: CraftSearchItem): string {
  const parts: string[] = [];

  if (item.markdown) {
    parts.push(item.markdown);
  }

  for (const block of item.blocks ?? []) {
    collectBlockMarkdown(block, parts);
  }

  return parts.join("\n");
}

function collectBlockMarkdown(block: CraftBlock, parts: string[]): void {
  if (block.title) {
    parts.push(block.title);
  }

  if (block.markdown) {
    parts.push(block.markdown);
  }

  for (const child of block.content ?? []) {
    collectBlockMarkdown(child, parts);
  }
}

async function fetchCraftJson<T>(
  connection: CraftConnection,
  path: string,
): Promise<T> {
  const endpoint = connection.endpoint.replace(/\/+$/, "");
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (connection.token?.trim()) {
    headers.Authorization = `Bearer ${connection.token.trim()}`;
  }

  const response = await fetch(`${endpoint}${path}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Craft API request failed with ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}
