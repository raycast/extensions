import { getPreferenceValues, showToast, Toast } from "@raycast/api";

export interface Project {
  id: string;
  name: string;
  containerTag: string;
  description?: string;
}

export interface Memory {
  id: string;
  content: string;
  title?: string;
  url?: string;
  containerTag?: string;
  createdAt: string;
}

export interface SearchResult {
  documentId: string;
  chunks: unknown[];
  title?: string;
  metadata: Record<string, unknown>;
  score?: number;
  createdAt: string;
  updatedAt: string;
  type: string;
}

export interface AddMemoryRequest {
  content: string;
  containerTags?: string[];
  title?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchRequest {
  q: string;
  containerTags?: string[];
  limit?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  timing: number;
  total: number;
}

const API_BASE_URL = "https://api.cognimemo.com";

class CognimemoAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "CognimemoAPIError";
  }
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

async function getApiKey(): Promise<string> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const apiKey = preferences.apiKey.trim();

    if (!apiKey) {
      throw new AuthenticationError(
        "API key is required. Please add your Cognimemo API key in preferences.",
      );
    }

    return apiKey;
  } catch {
    throw new AuthenticationError("Failed to get API key from preferences.");
  }
}

async function makeAuthenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = await getApiKey();

  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || "GET";

  // Log request
  console.log(`[API Request] ${method} ${url}`);
  if (options.body) {
    try {
      const bodyObj = JSON.parse(options.body as string);
      console.log("[API Request Body]", JSON.stringify(bodyObj, null, 2));
    } catch {
      console.log("[API Request Body]", options.body);
    }
  }
  console.log("[API Request Headers]", {
    Authorization: `Bearer ${apiKey.substring(0, 10)}...`,
    "Content-Type": "application/json",
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Log response status
    console.log(
      `[API Response] ${method} ${url} - Status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      let errorBody: { message?: string } | null = null;
      try {
        errorBody = (await response.json()) as { message?: string };
        console.log("[API Error Response]", JSON.stringify(errorBody, null, 2));
      } catch {
        const text = await response.text();
        console.log("[API Error Response (text)]", text);
      }

      if (response.status === 401) {
        throw new AuthenticationError(
          "Invalid API key. Please check your API key in preferences. Get a new one from https://app.cognimemo.com/integrations",
        );
      }

      let errorMessage = `API request failed: ${response.statusText}`;
      if (errorBody?.message) {
        errorMessage = errorBody.message;
      }

      throw new CognimemoAPIError(errorMessage, response.status);
    }

    if (!response.headers.get("content-type")?.includes("application/json")) {
      const text = await response.text();
      console.log("[API Response (non-JSON)]", text.substring(0, 200));
      throw new CognimemoAPIError("Invalid response format from API");
    }

    const data = (await response.json()) as T;
    console.log("[API Response Data]", JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    if (
      err instanceof AuthenticationError ||
      err instanceof CognimemoAPIError
    ) {
      console.error("[API Error]", err.message);
      throw err;
    }

    // Handle network errors or other fetch errors
    console.error("[API Network Error]", err);
    throw new CognimemoAPIError(
      `Network error: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

export async function fetchProjects(): Promise<Project[]> {
  try {
    const response = await makeAuthenticatedRequest<{ projects: Project[] }>(
      "/v1/projects",
    );
    return response.projects || [];
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch projects",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
    throw error;
  }
}

export async function addMemory(request: AddMemoryRequest): Promise<Memory> {
  try {
    const response = await makeAuthenticatedRequest<Memory>("/v1/documents", {
      method: "POST",
      body: JSON.stringify(request),
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Memory Added",
      message: "Successfully added memory to Cognimemo",
    });

    return response;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to add memory",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
    throw error;
  }
}

export async function searchMemories(
  request: SearchRequest,
): Promise<SearchResult[]> {
  try {
    console.log("[searchMemories] Request:", JSON.stringify(request, null, 2));
    const response = await makeAuthenticatedRequest<SearchResponse>(
      "/v1/search",
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    );

    console.log(
      "[searchMemories] Response:",
      JSON.stringify(response, null, 2),
    );
    console.log(
      "[searchMemories] Results count:",
      response.results?.length || 0,
    );

    // Map results to ensure all required fields are present
    const mappedResults: SearchResult[] = (response.results || []).map(
      (result) => {
        const title =
          result.title ||
          (typeof result.metadata?.title === "string"
            ? result.metadata.title
            : undefined) ||
          (typeof result.metadata?.projectName === "string"
            ? result.metadata.projectName
            : undefined) ||
          "Untitled Memory";

        return {
          ...result,
          title: title as string,
          type: result.type || "text",
        };
      },
    );

    console.log("[searchMemories] Mapped results count:", mappedResults.length);
    return mappedResults;
  } catch (error) {
    console.error("[searchMemories] Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to search memories",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
    throw error;
  }
}

// Helper function to check if API key is configured and valid
export async function checkApiConnection(): Promise<boolean> {
  try {
    // First check if API key exists in preferences
    const preferences = getPreferenceValues<Preferences>();
    const apiKey = preferences.apiKey.trim();

    if (!apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Required",
        message:
          "Please configure your CogniMemo API key in extension preferences. Get it from https://app.cognimemo.com/integrations",
      });
      return false;
    }

    // Then test if it's valid by fetching projects
    await fetchProjects();
    return true;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Invalid",
        message:
          error.message ||
          "Please check your CogniMemo API key in preferences. Get it from https://app.cognimemo.com/integrations",
      });
    }
    return false;
  }
}
