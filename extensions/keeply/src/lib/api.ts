import { getPreferenceValues } from "@raycast/api";
import type { Bookmark, CreateBookmarkPayload, Folder, SidebarData, Tag, UpdateBookmarkPayload } from "./types";

export class KeeplyApi {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.keeply.tools";

  constructor() {
    const prefs = getPreferenceValues<Preferences>();
    this.apiKey = prefs.apiKey;
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${this.apiKey}`,
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { ...this.headers, ...init?.headers } });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
      const raw = body.message;
      const msg = Array.isArray(raw) ? raw.join(", ") : (raw ?? `HTTP ${res.status}`);

      if (res.status === 401) throw new Error("Invalid API key. Update it in Extension Preferences.");
      if (res.status === 403)
        throw new Error("Missing required API key scope. Re-generate your key at app.keeply.tools/settings.");
      throw new Error(msg);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async whoami(): Promise<{ email: string; name?: string; isPro: boolean }> {
    return this.request("/users/me");
  }

  async listBookmarks(): Promise<Bookmark[]> {
    return this.request("/bookmarks");
  }

  async createBookmark(payload: CreateBookmarkPayload): Promise<Bookmark> {
    return this.request("/bookmarks", { method: "POST", body: JSON.stringify(payload) });
  }

  async updateBookmark(id: string, payload: UpdateBookmarkPayload): Promise<Bookmark> {
    return this.request(`/bookmarks/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  }

  async deleteBookmark(id: string): Promise<void> {
    return this.request(`/bookmarks/${id}`, { method: "DELETE" });
  }

  async searchBookmarks(query: string): Promise<Bookmark[]> {
    const res = await this.request<{ hits: Bookmark[] }>(`/search?q=${encodeURIComponent(query)}`);
    return res.hits;
  }

  async listFolders(): Promise<Folder[]> {
    return this.request("/folders");
  }

  async listTags(): Promise<Tag[]> {
    return this.request("/tags");
  }

  async getSidebarData(): Promise<SidebarData> {
    const [folders, tags] = await Promise.all([this.listFolders(), this.listTags()]);
    return { folders, tags };
  }

  async createTag(name: string): Promise<Tag> {
    return this.request("/tags", { method: "POST", body: JSON.stringify({ name }) });
  }
}
