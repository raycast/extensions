import { getPreferenceValues } from "@raycast/api";
import { IPreferences } from "../types";

const NOKO_BASE_URL = "https://api.nokotime.com/v2";

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
}

class ApiClient {
  private baseUrl: string;
  public headers: Record<string, string>;

  constructor() {
    this.baseUrl = NOKO_BASE_URL;
    this.headers = this.getHeaders();
  }

  private getHeaders(): Record<string, string> {
    const { personalAccessToken } = getPreferenceValues<IPreferences>();

    return {
      "X-NokoToken": personalAccessToken,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get("content-type");
    const text = await response.text();

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Handle empty responses (common for PUT/DELETE operations)
    if (!text.trim()) {
      return {
        success: true,
        data: {} as T,
      };
    }

    // Parse JSON if content type indicates it
    if (contentType?.includes("application/json")) {
      try {
        const data = JSON.parse(text);
        return {
          success: true,
          data,
        };
      } catch (error) {
        return {
          success: false,
          error: "Failed to parse JSON response",
        };
      }
    }

    return {
      success: true,
      data: text as T,
    };
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "GET",
        headers: this.headers,
      });
      return this.parseResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: this.headers,
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.parseResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "PUT",
        headers: this.headers,
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.parseResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "DELETE",
        headers: this.headers,
      });
      return this.parseResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }
}

export const apiClient = new ApiClient();
export type { ApiResponse };
