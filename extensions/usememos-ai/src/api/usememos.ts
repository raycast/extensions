import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  instanceUrl: string;
  accessToken: string;
  openaiApiUrl?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  syncServiceUrl?: string;
}

export interface Memo {
  name: string;
  uid: string;
  creator: string;
  content: string;
  visibility: "PRIVATE" | "WORKSPACE" | "PUBLIC";
  pinned: boolean;
  createTime: string;
  updateTime: string;
  displayTime: string;
  rowStatus: "NORMAL" | "ARCHIVED";
  tags?: string[];
  resources?: Resource[];
}

export interface Resource {
  name: string;
  uid: string;
  filename: string;
  type: string;
  size: number;
}

export interface ListMemosResponse {
  memos: Memo[];
  nextPageToken?: string;
}

export interface CreateMemoRequest {
  content: string;
  visibility?: "PRIVATE" | "WORKSPACE" | "PUBLIC";
}

class UsememosClient {
  private baseUrl: string;
  private accessToken: string;

  constructor() {
    const prefs = getPreferenceValues<Preferences>();
    this.baseUrl = prefs.instanceUrl.replace(/\/$/, "");
    this.accessToken = prefs.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error (${response.status}): ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async listMemos(options?: {
    filter?: string;
    pageSize?: number;
    pageToken?: string;
  }): Promise<ListMemosResponse> {
    const params = new URLSearchParams();
    if (options?.filter) params.set("filter", options.filter);
    if (options?.pageSize) params.set("pageSize", String(options.pageSize));
    if (options?.pageToken) params.set("pageToken", options.pageToken);

    const query = params.toString();
    return this.request<ListMemosResponse>(`/memos${query ? `?${query}` : ""}`);
  }

  async getMemo(name: string): Promise<Memo> {
    // name format: "memos/{id}"
    return this.request<Memo>(`/${name}`);
  }

  async createMemo(data: CreateMemoRequest): Promise<Memo> {
    return this.request<Memo>("/memos", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateMemo(
    name: string,
    data: Partial<Memo>,
    updateMask: string[],
  ): Promise<Memo> {
    const params = new URLSearchParams();
    params.set("updateMask", updateMask.join(","));

    return this.request<Memo>(`/${name}?${params.toString()}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteMemo(name: string): Promise<void> {
    await this.request(`/${name}`, { method: "DELETE" });
  }

  async archiveMemo(name: string): Promise<Memo> {
    return this.updateMemo(name, { rowStatus: "ARCHIVED" }, ["row_status"]);
  }

  async unarchiveMemo(name: string): Promise<Memo> {
    return this.updateMemo(name, { rowStatus: "NORMAL" }, ["row_status"]);
  }

  async pinMemo(name: string): Promise<Memo> {
    return this.updateMemo(name, { pinned: true }, ["pinned"]);
  }

  async unpinMemo(name: string): Promise<Memo> {
    return this.updateMemo(name, { pinned: false }, ["pinned"]);
  }

  async searchMemos(query: string): Promise<Memo[]> {
    // Use filter to search by content
    const filter = `content.contains("${query}")`;
    const result = await this.listMemos({ filter, pageSize: 50 });
    return result.memos;
  }

  getWebUrl(memo: Memo): string {
    const id = memo.name.replace("memos/", "");
    return `${this.baseUrl}/m/${id}`;
  }
}

let clientInstance: UsememosClient | null = null;

export function getUsememosClient(): UsememosClient {
  if (!clientInstance) {
    clientInstance = new UsememosClient();
  }
  return clientInstance;
}

export function resetClient(): void {
  clientInstance = null;
}
