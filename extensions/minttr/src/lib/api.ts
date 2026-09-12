import { getPreferenceValues } from "@raycast/api";

const DEFAULT_BASE_URL = "https://my.minttr.com";

function getApiConfig() {
  const preferences = getPreferenceValues();
  const baseUrl = preferences.apiBaseUrl || DEFAULT_BASE_URL;
  const token = preferences.apiToken;

  return { baseUrl, token };
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const { baseUrl, token } = getApiConfig();

  const url = `${baseUrl}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle responses with no content
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      if (!response.ok) {
        return {
          success: false,
          error: `Request failed with status ${response.status}`,
        };
      }
      return { success: true } as ApiResponse<T>;
    }

    let data: ApiResponse<T>;
    try {
      data = await response.json();
    } catch {
      if (!response.ok) {
        return {
          success: false,
          error: `Request failed with status ${response.status}`,
        };
      }
      return { success: true } as ApiResponse<T>;
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export interface CreateNoteParams {
  content: string;
}

export async function createNote(
  params: CreateNoteParams,
): Promise<ApiResponse> {
  return apiRequest("/api/v1/note", {
    method: "POST",
    body: JSON.stringify({ data: params }),
  });
}

export interface CreateLinkParams {
  url: string;
  note?: string;
}

export async function createLink(
  params: CreateLinkParams,
): Promise<ApiResponse> {
  return apiRequest("/api/v1/link", {
    method: "POST",
    body: JSON.stringify({ data: params }),
  });
}
