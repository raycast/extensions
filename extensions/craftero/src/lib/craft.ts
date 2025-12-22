import {
  CraftCollectionItem,
  CraftCollectionSchema,
  CraftConfig,
} from "./types";

type CraftTextBlock = {
  type: "text";
  markdown: string;
};

export class CraftClient {
  private config: CraftConfig;
  private baseUrl: string;

  constructor(config: CraftConfig) {
    this.config = config;
    const trimmed = config.apiBaseUrl.trim();
    const normalized = trimmed.replace(/\/$/, "");
    this.baseUrl = normalizeCraftApiBase(normalized);
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  async getCollectionSchema(): Promise<CraftCollectionSchema | null> {
    const url = `${this.baseUrl}/collections/${this.config.collectionId}/schema?format=schema`;
    const response = await fetch(url, { headers: this.getHeaders() });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CraftCollectionSchema;
  }

  async getCollectionItems(): Promise<CraftCollectionItem[]> {
    const url = `${this.baseUrl}/collections/${this.config.collectionId}/items?maxDepth=0`;
    const response = await fetch(url, { headers: this.getHeaders() });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Craft collection items: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { items?: CraftCollectionItem[] };
    return data.items || [];
  }

  async canAccessBlock(blockId: string): Promise<boolean> {
    const url = `${this.baseUrl}/blocks?id=${encodeURIComponent(blockId)}&maxDepth=0`;
    const response = await fetch(url, { headers: this.getHeaders() });

    if (response.ok) return true;
    if (response.status === 404) return false;

    const errorText = await response.text();
    throw new Error(
      `Failed to verify block access: ${response.status} ${formatErrorText(errorText)}`,
    );
  }

  async getDailyNoteId(date: string): Promise<string> {
    const url = `${this.baseUrl}/blocks?date=${encodeURIComponent(date)}&maxDepth=0`;
    const response = await fetch(url, { headers: this.getHeaders() });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch daily note: ${response.status} ${formatErrorText(errorText)}`,
      );
    }

    const data = (await response.json()) as { id?: string };
    if (!data.id) {
      throw new Error("Daily note ID missing in response");
    }

    return data.id;
  }

  async getBlockSpaceId(blockId: string): Promise<string | null> {
    const url = `${this.baseUrl}/blocks?id=${encodeURIComponent(blockId)}&maxDepth=0`;
    const response = await fetch(url, { headers: this.getHeaders() });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch block info: ${response.status} ${formatErrorText(errorText)}`,
      );
    }

    const data = (await response.json()) as unknown;
    return findSpaceId(data);
  }

  async createCollectionItem(
    title: string,
    properties: Record<string, unknown>,
    contentBlocks: CraftTextBlock[],
    contentFieldKey = "title",
    options?: { allowNewSelectOptions?: boolean },
  ): Promise<string> {
    const createResponse = await fetch(
      `${this.baseUrl}/collections/${this.config.collectionId}/items`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...(options?.allowNewSelectOptions
            ? { allowNewSelectOptions: true }
            : {}),
          items: [
            {
              [contentFieldKey]: title,
              properties,
            },
          ],
        }),
      },
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(
        `Failed to create Craft collection item: ${createResponse.status} ${formatErrorText(errorText)}`,
      );
    }

    const createData = (await createResponse.json()) as {
      items?: Array<{ id?: string }>;
    };
    const newItemId = createData.items?.[0]?.id;

    if (!newItemId) {
      throw new Error("Created item ID not found");
    }

    if (contentBlocks.length > 0) {
      await this.addItemBlocks(newItemId, contentBlocks);
    }

    return newItemId;
  }

  async updateCollectionItem(
    itemId: string,
    title: string,
    properties: Record<string, unknown>,
    contentFieldKey = "title",
    options?: { allowNewSelectOptions?: boolean },
  ): Promise<void> {
    const body = JSON.stringify({
      ...(options?.allowNewSelectOptions
        ? { allowNewSelectOptions: true }
        : {}),
      itemsToUpdate: [
        {
          id: itemId,
          [contentFieldKey]: title,
          properties,
        },
      ],
    });

    const updateResponse = await fetch(
      `${this.baseUrl}/collections/${this.config.collectionId}/items`,
      {
        method: "PUT",
        headers: this.getHeaders(),
        body,
      },
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(
        `Failed to update Craft collection item: ${updateResponse.status} ${formatErrorText(errorText)} (baseUrl: ${this.baseUrl})`,
      );
    }
  }

  async addItemBlocks(itemId: string, blocks: CraftTextBlock[]): Promise<void> {
    if (blocks.length === 0) return;
    const contentResponse = await fetch(`${this.baseUrl}/blocks`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        blocks,
        position: {
          position: "end",
          pageId: itemId,
        },
      }),
    });

    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      throw new Error(
        `Failed to add content to Craft item: ${contentResponse.status} ${formatErrorText(errorText)}`,
      );
    }
  }

  async deleteCollectionItems(itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    const deleteResponse = await fetch(
      `${this.baseUrl}/collections/${this.config.collectionId}/items`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
        body: JSON.stringify({ idsToDelete: itemIds }),
      },
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(
        `Failed to delete Craft collection items: ${deleteResponse.status} ${formatErrorText(errorText)}`,
      );
    }
  }
}

function formatErrorText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "Unknown error";
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return trimmed;
  }
}

function normalizeCraftApiBase(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    const host = url.hostname.toLowerCase();
    if (host === "craft.do" || host === "www.craft.do") {
      url.hostname = "connect.craft.do";
    }
    if (url.pathname.startsWith("/connect-server/links/")) {
      url.pathname = url.pathname.replace("/connect-server/links/", "/links/");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return baseUrl.replace(/\/connect-server\/links\//i, "/links/");
  }
}

function findSpaceId(data: unknown): string | null {
  const visited = new Set<unknown>();
  const stack: unknown[] = [data];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (Array.isArray(current)) {
      for (const value of current) {
        stack.push(value);
      }
      continue;
    }
    if (typeof current === "object") {
      if (visited.has(current)) continue;
      visited.add(current);
      const record = current as Record<string, unknown>;
      const directSpaceId = record.spaceId ?? record.spaceID ?? record.space_id;
      if (typeof directSpaceId === "string" && directSpaceId.trim() !== "") {
        return directSpaceId;
      }
      const space = record.space;
      if (space && typeof space === "object") {
        const spaceRecord = space as Record<string, unknown>;
        const spaceRecordId =
          spaceRecord.id ??
          spaceRecord.spaceId ??
          spaceRecord.spaceID ??
          spaceRecord.space_id;
        if (typeof spaceRecordId === "string" && spaceRecordId.trim() !== "") {
          return spaceRecordId;
        }
      }
      for (const value of Object.values(record)) {
        stack.push(value);
      }
    }
  }

  return null;
}
