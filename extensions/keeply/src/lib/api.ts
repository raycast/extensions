import { authorize } from "./auth.js";
import type { Bookmark, CreateBookmarkPayload, Folder, SidebarData, Tag, UpdateBookmarkPayload } from "./types.js";

export class KeeplyApi {
  private readonly baseUrl = "https://api.keeply.tools";

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await authorize();
    return {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${token}`,
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { ...headers, ...init?.headers } });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
      const raw = body.message;
      const msg = Array.isArray(raw) ? raw.join(", ") : (raw ?? `HTTP ${res.status}`);

      if (res.status === 401) throw new Error("Session expired. Please re-authenticate.");
      if (res.status === 403) throw new Error("Access denied.");
      throw new Error(msg);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async listBookmarks(): Promise<Bookmark[]> {
    const first = await this.request<{ data: Bookmark[]; total: number; limit: number }>("/bookmarks?limit=500");
    const bookmarks = [...first.data];

    if (first.total > first.limit) {
      const totalPages = Math.ceil(first.total / first.limit);
      const pages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          this.request<{ data: Bookmark[] }>(`/bookmarks?limit=500&page=${i + 2}`),
        ),
      );
      bookmarks.push(...pages.flatMap((r) => r.data));
    }

    return bookmarks;
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
