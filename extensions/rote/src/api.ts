import {
  getPreferenceValues,
  showToast,
  Toast,
  LocalStorage,
} from "@raycast/api";
import type { Preferences } from "@raycast/api";
import {
  ApiResponse,
  Note,
  CreateNotePayload,
  UpdateNotePayload,
  SearchParams,
  ListParams,
  LoginResponse,
  RefreshResponse,
  StoredTokens,
} from "./types";

// Rote API Client - Bearer Token 认证

const TOKEN_STORAGE_KEY = "rote_tokens";
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5分钟缓冲，提前刷新

class RoteApiClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private tokens: StoredTokens | null = null;
  private loginPromise: Promise<void> | null = null;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.baseUrl =
      (preferences.apiEndpoint as unknown as string).replace(/\/$/, "").trim() +
      "/v2/api";
    this.username = ((preferences.username as unknown as string) || "").trim();
    this.password = (preferences.password as unknown as string) || "";
  }

  // 加载存储的 token
  private async loadTokens(): Promise<StoredTokens | null> {
    try {
      const stored = await LocalStorage.getItem<string>(TOKEN_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as StoredTokens;
      }
    } catch {
      // ignore
    }
    return null;
  }

  // 保存 token
  private async saveTokens(tokens: StoredTokens): Promise<void> {
    await LocalStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    this.tokens = tokens;
  }

  // 清除 token
  private async clearTokens(): Promise<void> {
    await LocalStorage.removeItem(TOKEN_STORAGE_KEY);
    this.tokens = null;
  }

  // 判断是否是邮箱格式
  private isEmail(str: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  }

  // 登录获取 token
  private async login(): Promise<void> {
    const loginUrl = `${this.baseUrl}/auth/login`;
    console.log("=== LOGIN DEBUG ===");
    console.log("Login URL:", loginUrl);
    console.log("Base URL:", this.baseUrl);
    console.log("Username/Email:", this.username);

    // 自动判断是邮箱还是用户名
    const isEmailLogin = this.isEmail(this.username);
    const requestBody = JSON.stringify(
      isEmailLogin
        ? { email: this.username, password: this.password }
        : { username: this.username, password: this.password },
    );
    console.log("Login type:", isEmailLogin ? "email" : "username");
    console.log("Request body:", requestBody);

    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: requestBody,
    });

    const text = await response.text();
    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      JSON.stringify(Object.fromEntries(response.headers.entries())),
    );
    console.log("Response body (first 300 chars):", text.substring(0, 300));
    console.log("=== END DEBUG ===");

    if (text.startsWith("<!") || text.startsWith("<html")) {
      throw new Error("服务器返回HTML，检查API地址是否正确");
    }

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status} ${text.substring(0, 100)}`);
    }

    const data = JSON.parse(text) as ApiResponse<LoginResponse>;

    if (data.code !== 0) {
      throw new Error(data.message || "登录失败");
    }

    // 保存 token，设置1小时过期（实际可能更长，但保守处理）
    const tokens: StoredTokens = {
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1小时
    };

    await this.saveTokens(tokens);
    console.log("Login successful");
  }

  // 刷新 token
  private async refreshTokens(): Promise<boolean> {
    if (!this.tokens?.refreshToken) {
      return false;
    }

    console.log("Refreshing token...");

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshToken: this.tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        console.log("Token refresh failed, need re-login");
        return false;
      }

      const text = await response.text();
      const data = JSON.parse(text) as ApiResponse<RefreshResponse>;

      if (data.code !== 0) {
        return false;
      }

      const tokens: StoredTokens = {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };

      await this.saveTokens(tokens);
      console.log("Token refreshed");
      return true;
    } catch {
      return false;
    }
  }

  // 确保有有效的 token
  private async ensureAuth(): Promise<string> {
    // 如果正在登录，等待完成
    if (this.loginPromise) {
      await this.loginPromise;
    }

    // 加载存储的 token
    if (!this.tokens) {
      this.tokens = await this.loadTokens();
    }

    // 检查 token 是否即将过期
    if (
      this.tokens &&
      this.tokens.expiresAt - Date.now() < TOKEN_EXPIRY_BUFFER
    ) {
      // 尝试刷新
      const refreshed = await this.refreshTokens();
      if (!refreshed) {
        // 刷新失败，需要重新登录
        await this.clearTokens();
      }
    }

    // 如果没有 token，登录
    if (!this.tokens) {
      this.loginPromise = this.login();
      try {
        await this.loginPromise;
      } finally {
        this.loginPromise = null;
      }
    }

    if (!this.tokens) {
      throw new Error("无法获取认证token");
    }

    return this.tokens.accessToken;
  }

  // 发送认证请求
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(
      "API Request:",
      options.method || "GET",
      url.replace(/\?.*/, "?..."),
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // 需要认证的请求添加 Bearer token
    if (requireAuth) {
      const token = await this.ensureAuth();
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const responseText = await response.text();

      if (responseText.startsWith("<!") || responseText.startsWith("<html")) {
        throw new Error(`服务器返回HTML (${response.status})，检查API配置`);
      }

      // 401 未授权，可能 token 过期，清除并重试一次
      if (response.status === 401 && requireAuth) {
        console.log("Got 401, clearing tokens and retrying...");
        await this.clearTokens();
        const newToken = await this.ensureAuth();
        headers["Authorization"] = `Bearer ${newToken}`;

        const retryResponse = await fetch(url, { ...options, headers });
        const retryText = await retryResponse.text();

        if (!retryResponse.ok) {
          throw new Error(
            `HTTP ${retryResponse.status}: ${retryText.substring(0, 100)}`,
          );
        }

        const retryData = JSON.parse(retryText) as ApiResponse<T>;
        if (retryData.code !== 0) {
          throw new Error(retryData.message || "Unknown error");
        }
        return retryData.data;
      }

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${responseText.substring(0, 100)}`,
        );
      }

      const data = JSON.parse(responseText) as ApiResponse<T>;

      if (data.code !== 0) {
        throw new Error(data.message || "Unknown error");
      }

      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      await showToast({
        style: Toast.Style.Failure,
        title: "API Error",
        message: message.substring(0, 100),
      });
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!this.username && !!this.password;
  }

  // 获取笔记列表
  async getNotes(params: ListParams = {}): Promise<Note[]> {
    const searchParams = new URLSearchParams();
    if (params.skip !== undefined)
      searchParams.append("skip", String(params.skip));
    if (params.limit !== undefined)
      searchParams.append("limit", String(params.limit));
    if (params.archived !== undefined)
      searchParams.append("archived", String(params.archived));
    if (params.tag) searchParams.append("tag", params.tag);

    const query = searchParams.toString();
    const endpoint = `/notes${query ? `?${query}` : ""}`;

    return this.request<Note[]>(endpoint);
  }

  // 搜索笔记
  async searchNotes(params: SearchParams): Promise<Note[]> {
    const searchParams = new URLSearchParams();
    searchParams.append("keyword", params.keyword);
    if (params.skip !== undefined)
      searchParams.append("skip", String(params.skip));
    if (params.limit !== undefined)
      searchParams.append("limit", String(params.limit));

    return this.request<Note[]>(`/notes/search?${searchParams.toString()}`);
  }

  // 创建笔记
  async createNote(payload: CreateNotePayload): Promise<Note> {
    return this.request<Note>("/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // 更新笔记
  async updateNote(noteId: string, payload: UpdateNotePayload): Promise<Note> {
    return this.request<Note>(`/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  // 删除笔记
  async deleteNote(noteId: string): Promise<void> {
    return this.request<void>(`/notes/${noteId}`, {
      method: "DELETE",
    });
  }

  // 切换置顶状态
  async togglePin(noteId: string, pin: boolean): Promise<Note> {
    return this.updateNote(noteId, { pin });
  }

  // 切换归档状态
  async toggleArchive(noteId: string, archived: boolean): Promise<Note> {
    return this.updateNote(noteId, { archived });
  }

  // 获取随机笔记（使用API端点）
  async getRandomNote(): Promise<Note | null> {
    try {
      // 随机笔记端点不需要认证，但返回的是公开笔记
      // 如果要随机自己的笔记，需要从列表中随机选
      const notes = await this.getNotes({ limit: 100 });

      if (!notes || notes.length === 0) {
        return null;
      }

      const randomIndex = Math.floor(Math.random() * notes.length);
      return notes[randomIndex];
    } catch {
      return null;
    }
  }

  getBaseUrl(): string {
    return this.baseUrl.replace("/v2/api", "");
  }
}

let clientInstance: RoteApiClient | null = null;

export function getApiClient(): RoteApiClient {
  if (!clientInstance) {
    clientInstance = new RoteApiClient();
  }
  return clientInstance;
}

export function resetApiClient(): void {
  clientInstance = null;
}
