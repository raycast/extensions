import { getPreferenceValues, LocalStorage } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  limitlessApiKey?: string;
}

interface LifelogContent {
  type: "heading1" | "heading2" | "blockquote";
  content: string;
  startTime: string;
  endTime: string;
  startOffsetMs: number;
  endOffsetMs: number;
  children: LifelogContent[];
  speakerName: string;
  speakerIdentifier: "user" | null;
}

interface Lifelog {
  id: string;
  title: string;
  markdown: string;
  contents: LifelogContent[];
}

interface LifelogResponse {
  data: {
    lifelogs: Lifelog[];
  };
  meta: {
    lifelogs: {
      nextCursor: string;
      count: number;
    };
  };
}

interface GetLifelogsParams {
  timezone?: string;
  date?: string;
  start?: string;
  end?: string;
  cursor?: string;
  direction?: "asc" | "desc";
  includeMarkdown?: boolean;
  includeHeadings?: boolean;
  limit?: number;
}

interface PendantData {
  id: string;
  name: string;
  status: string;
  lastSync: string;
  batteryLevel?: number;
}

interface APIError {
  message: string;
  code?: string;
}

export class LimitlessAPI {
  private static instance: LimitlessAPI;
  private apiKey: string | undefined;
  private baseUrl = "https://api.limitless.ai/v1";

  private constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.apiKey = preferences.limitlessApiKey;
    this.initializeApiKey();
  }

  private async initializeApiKey() {
    try {
      // Check if API key is stored in LocalStorage
      const localStorageKey = await LocalStorage.getItem<string>("limitlessApiKey");
      if (localStorageKey) {
        this.apiKey = localStorageKey;
      }
    } catch (error) {
      console.error("Failed to get API key from LocalStorage:", error);
    }
  }

  public static getInstance(): LimitlessAPI {
    if (!LimitlessAPI.instance) {
      LimitlessAPI.instance = new LimitlessAPI();
    }
    return LimitlessAPI.instance;
  }

  public setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  public hasApiKey(): boolean {
    return !!this.apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error("API key not set. Please set your API key in the extension preferences.");
    }

    const headers = {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as APIError;
        throw new Error(error.message || `API request failed: ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to make API request");
    }
  }

  // Get information about the user's pendant
  public async getPendantData(): Promise<PendantData> {
    return this.request<PendantData>("/pendant");
  }

  // Get a specific lifelog by ID
  public async getLifelogById(id: string): Promise<Lifelog> {
    const response = await this.request<{ data: { lifelog: Lifelog } }>(`/lifelogs/${id}`);
    return response.data.lifelog;
  }

  // Get lifelogs with optional parameters
  public async getLifelogs(params: GetLifelogsParams = {}): Promise<LifelogResponse> {
    const queryParams = new URLSearchParams();

    if (params.timezone) queryParams.append("timezone", params.timezone);
    if (params.date) queryParams.append("date", params.date);
    if (params.start) queryParams.append("start", params.start);
    if (params.end) queryParams.append("end", params.end);
    if (params.cursor) queryParams.append("cursor", params.cursor);
    if (params.direction) queryParams.append("direction", params.direction);
    if (params.includeMarkdown !== undefined) queryParams.append("includeMarkdown", params.includeMarkdown.toString());
    if (params.includeHeadings !== undefined) queryParams.append("includeHeadings", params.includeHeadings.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = `/lifelogs${queryString ? `?${queryString}` : ""}`;

    return this.request<LifelogResponse>(endpoint);
  }

  // Search through lifelogs
  public async searchLifelogs(query: string): Promise<LifelogResponse> {
    const queryParams = new URLSearchParams({
      q: query,
    });
    return this.request<LifelogResponse>(`/lifelogs/search?${queryParams}`);
  }

  // Get a summary of recent activity
  public async getActivitySummary(): Promise<{
    totalTranscripts: number;
    lastSync: string;
    recentTopics: string[];
  }> {
    return this.request<{
      totalTranscripts: number;
      lastSync: string;
      recentTopics: string[];
    }>("/activity/summary");
  }

  // Search through transcripts
  public async searchTranscripts(query: string): Promise<Lifelog[]> {
    const response = await this.request<{ data: { lifelogs: Lifelog[] } }>(
      `/lifelogs/search?q=${encodeURIComponent(query)}`,
    );
    return response.data.lifelogs;
  }
}
