import { getPreferenceValues, showToast, Toast, Cache } from "@raycast/api";

import {
  WPPost,
  WPPage,
  WPMedia,
  WPComment,
  WPUser,
  WPPlugin,
  WPCategory,
  WPTag,
  WPSiteInfo,
  CreatePostParams,
  UpdatePostParams,
  CreatePageParams,
  UpdatePageParams,
  SearchParams,
  ApiError,
} from "./types";

class WordPressAPI {
  private baseUrl: string;
  private authHeader: string;
  private cache = new Cache();

  constructor() {
    const prefs = getPreferenceValues();
    this.baseUrl = prefs.siteUrl.replace(/\/$/, "") + "/wp-json/wp/v2";
    const credentials = Buffer.from(`${prefs.username}:${prefs.applicationPassword}`).toString("base64");
    this.authHeader = `Basic ${credentials}`;
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: Record<string, unknown>;
      params?: Record<string, string | number | boolean | string[] | undefined>;
    } = {}
  ): Promise<T> {
    const { method = "GET", body, params } = options;

    let url = `${this.baseUrl}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    if (method !== "GET") {
      this.cache.clear();
    }

    if (method === "GET") {
      const cached = this.cache.get(url);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const error = (await response.json()) as ApiError;
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle DELETE requests that return 200 with deleted object
      if (method === "DELETE" && response.status === 200) {
        return (await response.json()) as T;
      }

      // Handle successful responses
      if (response.status === 204) {
        return {} as T;
      }

      const data = (await response.json()) as T;

      if (method === "GET") {
        this.cache.set(url, JSON.stringify(data));
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      await showToast({
        style: Toast.Style.Failure,
        title: "API Error",
        message: message,
      });
      throw error;
    }
  }

  // Posts
  async getPosts(params?: SearchParams & { categories?: number; tags?: number }): Promise<WPPost[]> {
    return this.request<WPPost[]>("/posts", {
      params: {
        ...params,
        _embed: "true",
        per_page: params?.per_page || 20,
        context: "edit",
      },
    });
  }

  async getPost(id: number): Promise<WPPost> {
    return this.request<WPPost>(`/posts/${id}`, {
      params: { _embed: "true", context: "edit" },
    });
  }

  async createPost(data: CreatePostParams): Promise<WPPost> {
    return this.request<WPPost>("/posts", {
      method: "POST",
      body: data as unknown as Record<string, unknown>,
    });
  }

  async updatePost(id: number, data: Partial<UpdatePostParams>): Promise<WPPost> {
    return this.request<WPPost>(`/posts/${id}`, {
      method: "POST",
      body: data as unknown as Record<string, unknown>,
    });
  }

  async deletePost(id: number, force = false): Promise<WPPost> {
    return this.request<WPPost>(`/posts/${id}`, {
      method: "DELETE",
      params: { force },
    });
  }

  // Pages
  async getPages(params?: SearchParams & { parent?: number }): Promise<WPPage[]> {
    return this.request<WPPage[]>("/pages", {
      params: {
        ...params,
        _embed: "true",
        per_page: params?.per_page || 20,
        context: "edit",
      },
    });
  }

  async getPage(id: number): Promise<WPPage> {
    return this.request<WPPage>(`/pages/${id}`, {
      params: { _embed: "true", context: "edit" },
    });
  }

  async createPage(data: CreatePageParams): Promise<WPPage> {
    return this.request<WPPage>("/pages", {
      method: "POST",
      body: data as unknown as Record<string, unknown>,
    });
  }

  async updatePage(id: number, data: Partial<UpdatePageParams>): Promise<WPPage> {
    return this.request<WPPage>(`/pages/${id}`, {
      method: "POST",
      body: data as unknown as Record<string, unknown>,
    });
  }

  async deletePage(id: number, force = false): Promise<WPPage> {
    return this.request<WPPage>(`/pages/${id}`, {
      method: "DELETE",
      params: { force },
    });
  }

  // Media
  async getMedia(params?: SearchParams & { media_type?: string }): Promise<WPMedia[]> {
    return this.request<WPMedia[]>("/media", {
      params: {
        ...params,
        per_page: params?.per_page || 20,
      },
    });
  }

  async getMediaItem(id: number): Promise<WPMedia> {
    return this.request<WPMedia>(`/media/${id}`);
  }

  async deleteMedia(id: number, force = true): Promise<WPMedia> {
    return this.request<WPMedia>(`/media/${id}`, {
      method: "DELETE",
      params: { force },
    });
  }

  // Comments
  async getComments(params?: SearchParams & { post?: number }): Promise<WPComment[]> {
    return this.request<WPComment[]>("/comments", {
      params: {
        ...params,
        _embed: "true",
        per_page: params?.per_page || 20,
      },
    });
  }

  async getComment(id: number): Promise<WPComment> {
    return this.request<WPComment>(`/comments/${id}`, {
      params: { _embed: "true" },
    });
  }

  async updateComment(
    id: number,
    data: { status?: "approved" | "hold" | "spam" | "trash"; content?: string }
  ): Promise<WPComment> {
    return this.request<WPComment>(`/comments/${id}`, {
      method: "POST",
      body: data as unknown as Record<string, unknown>,
    });
  }

  async deleteComment(id: number, force = false): Promise<WPComment> {
    return this.request<WPComment>(`/comments/${id}`, {
      method: "DELETE",
      params: { force },
    });
  }

  // Users
  async getUsers(params?: SearchParams & { roles?: string }): Promise<WPUser[]> {
    return this.request<WPUser[]>("/users", {
      params: {
        ...params,
        per_page: params?.per_page || 20,
        context: "edit",
      },
    });
  }

  async getUser(id: number): Promise<WPUser> {
    return this.request<WPUser>(`/users/${id}`, {
      params: { context: "edit" },
    });
  }

  async getCurrentUser(): Promise<WPUser> {
    return this.request<WPUser>("/users/me", {
      params: { context: "edit" },
    });
  }

  // Plugins
  async getPlugins(): Promise<WPPlugin[]> {
    return this.request<WPPlugin[]>("/plugins");
  }

  async activatePlugin(plugin: string): Promise<WPPlugin> {
    return this.request<WPPlugin>(`/plugins/${encodeURIComponent(plugin)}`, {
      method: "POST",
      body: { status: "active" },
    });
  }

  async deactivatePlugin(plugin: string): Promise<WPPlugin> {
    return this.request<WPPlugin>(`/plugins/${encodeURIComponent(plugin)}`, {
      method: "POST",
      body: { status: "inactive" },
    });
  }

  // Categories
  async getCategories(params?: SearchParams): Promise<WPCategory[]> {
    return this.request<WPCategory[]>("/categories", {
      params: {
        ...params,
        per_page: params?.per_page || 100,
      },
    });
  }

  async createCategory(data: { name: string; description?: string; parent?: number }): Promise<WPCategory> {
    return this.request<WPCategory>("/categories", {
      method: "POST",
      body: data,
    });
  }

  // Tags
  async getTags(params?: SearchParams): Promise<WPTag[]> {
    return this.request<WPTag[]>("/tags", {
      params: {
        ...params,
        per_page: params?.per_page || 100,
      },
    });
  }

  async createTag(data: { name: string; description?: string }): Promise<WPTag> {
    return this.request<WPTag>("/tags", {
      method: "POST",
      body: data,
    });
  }

  // Site Info
  async getSiteInfo(): Promise<WPSiteInfo> {
    const prefs = getPreferenceValues();
    const url = prefs.siteUrl.replace(/\/$/, "") + "/wp-json";

    const cached = this.cache.get(url);
    if (cached) {
      return JSON.parse(cached) as WPSiteInfo;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch site info: ${response.statusText}`);
    }

    const data = (await response.json()) as WPSiteInfo;
    this.cache.set(url, JSON.stringify(data));
    return data;
  }

  // Search across content types
  async search(query: string, type?: "post" | "page" | "any"): Promise<Array<WPPost | WPPage>> {
    const results: Array<WPPost | WPPage> = [];

    if (!type || type === "post" || type === "any") {
      const posts = await this.getPosts({ search: query, per_page: 10 });
      results.push(...posts);
    }

    if (!type || type === "page" || type === "any") {
      const pages = await this.getPages({ search: query, per_page: 10 });
      results.push(...pages);
    }

    return results;
  }
}

// Export singleton instance
export const wp = new WordPressAPI();

// Export class for testing
export { WordPressAPI };
