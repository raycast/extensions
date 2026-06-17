import { getPreferenceValues, LocalStorage } from "@raycast/api";
import {
  Persona,
  KnowledgeCard,
  QueryRequest,
  QueryResponse,
  QueryPreset,
  FileUploadResponse,
  TextUploadRequest,
  AssociateFilesRequest,
  APIError,
  FILE_SOURCE_RAYCAST,
} from "./types";
import { getClientInfo } from "./client-info";

const API_KEY_STORAGE_KEY = "toneclone-api-key";

// Utility function to redact API keys from strings for safe logging
function redactApiKey(text: string): string {
  // Redact API keys in Bearer tokens and tc_ prefixed keys
  return text
    .replace(/Bearer\s+tc_[a-zA-Z0-9_]+/gi, "Bearer tc_***REDACTED***")
    .replace(/tc_[a-zA-Z0-9_]+/gi, "tc_***REDACTED***")
    .replace(/"apiKey":\s*"[^"]*"/gi, '"apiKey": "***REDACTED***"');
}

class ToneCloneAPI {
  private baseUrl: string;
  private _cachedApiKey: string | null = null;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();

    // Validate and set API URL - default to production API
    const rawUrl = preferences.apiUrl?.trim() || "https://api.toneclone.ai";
    try {
      const url = new URL(rawUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("API URL must use HTTP or HTTPS protocol");
      }
      this.baseUrl = rawUrl;
    } catch {
      throw new Error(`Invalid API URL format: ${rawUrl}`);
    }
  }

  private async getApiKey(): Promise<string> {
    // Return cached key if available
    if (this._cachedApiKey) {
      return this._cachedApiKey;
    }

    const preferences = getPreferenceValues<Preferences>();

    // First, try to get API key from preferences (manual entry)
    if (preferences.apiKey && preferences.apiKey.trim()) {
      this._cachedApiKey = preferences.apiKey.trim();
      return this._cachedApiKey;
    }

    // Then try to get API key from local storage (OAuth generated)
    const storedApiKey = await LocalStorage.getItem<string>(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      this._cachedApiKey = storedApiKey;
      return this._cachedApiKey;
    }

    throw new Error("No API key found. Please authenticate first.");
  }

  // Clear cached API key (useful for logout)
  clearApiKeyCache(): void {
    this._cachedApiKey = null;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const apiKey = await this.getApiKey();

    // Add client tracking query parameters
    const clientInfo = getClientInfo(this.baseUrl);
    const clientParams = new URLSearchParams({
      client: clientInfo.name,
      client_version: clientInfo.version,
      client_channel: clientInfo.channel,
      client_env: clientInfo.env,
    });

    // Append client params to endpoint
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${this.baseUrl}${endpoint}${separator}${clientParams.toString()}`;

    const headers: HeadersInit = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: APIError;
        try {
          errorData = (await response.json()) as APIError;
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || errorData.message || "API request failed");
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error) {
        // Ensure any error messages don't contain API keys
        const safeMessage = redactApiKey(error.message);
        if (safeMessage !== error.message) {
          throw new Error(safeMessage);
        }
        throw error;
      }
      throw new Error("Network error occurred");
    }
  }

  async getPersonas(): Promise<Persona[]> {
    return this.makeRequest<Persona[]>("/personas");
  }

  async getBuiltInPersonas(): Promise<Persona[]> {
    return this.makeRequest<Persona[]>("/personas/builtin");
  }

  async getKnowledgeCards(): Promise<KnowledgeCard[]> {
    return this.makeRequest<KnowledgeCard[]>("/knowledge");
  }

  async getPersonaKnowledgeCards(personaId: string): Promise<KnowledgeCard[]> {
    const knowledgeCards = await this.makeRequest<KnowledgeCard[]>(`/personas/${personaId}/knowledge`);
    // Filter to only enabled knowledge cards
    return knowledgeCards; // ? knowledgeCards.filter(knowledgeCard => knowledgeCard.isEnabled) : [];
  }

  async createKnowledgeCard(name: string, instructions: string): Promise<KnowledgeCard> {
    return this.makeRequest<KnowledgeCard>("/knowledge", {
      method: "POST",
      body: JSON.stringify({ name, instructions }),
    });
  }

  async updateKnowledgeCard(knowledgeCardId: string, name: string, instructions: string): Promise<KnowledgeCard> {
    return this.makeRequest<KnowledgeCard>(`/knowledge/${knowledgeCardId}`, {
      method: "PUT",
      body: JSON.stringify({ name, instructions }),
    });
  }

  async deleteKnowledgeCard(knowledgeCardId: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/knowledge/${knowledgeCardId}`, {
      method: "DELETE",
    });
  }

  async getQueryPresets(parentUrl?: string): Promise<QueryPreset[]> {
    const url = parentUrl ? `/query/presets?parentURL=${encodeURIComponent(parentUrl)}` : "/query/presets";
    return this.makeRequest<QueryPreset[]>(url);
  }

  async createQueryPreset(preset: Omit<QueryPreset, "presetId">): Promise<QueryPreset> {
    return this.makeRequest<QueryPreset>("/query/presets", {
      method: "POST",
      body: JSON.stringify(preset),
    });
  }

  async updateQueryPreset(presetId: string, preset: Omit<QueryPreset, "presetId">): Promise<QueryPreset> {
    return this.makeRequest<QueryPreset>(`/query/presets/${presetId}`, {
      method: "PUT",
      body: JSON.stringify(preset),
    });
  }

  async deleteQueryPreset(presetId: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/query/presets/${presetId}`, {
      method: "DELETE",
    });
  }

  async generateText(request: QueryRequest): Promise<QueryResponse> {
    // Set streaming to false for Raycast integration
    const requestWithStreaming = {
      ...request,
      streaming: false,
    };

    return this.makeRequest<QueryResponse>("/query", {
      method: "POST",
      body: JSON.stringify(requestWithStreaming),
    });
  }

  async uploadText(request: TextUploadRequest): Promise<FileUploadResponse> {
    return this.makeRequest<FileUploadResponse>("/files/text", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async uploadFile(file: File): Promise<FileUploadResponse> {
    const apiKey = await this.getApiKey();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", FILE_SOURCE_RAYCAST);

    // Use direct fetch for file upload to avoid Content-Type issues
    const url = `${this.baseUrl}/files`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for file uploads

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          // Don't set Content-Type for FormData, let fetch set it with boundary
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: APIError;
        try {
          errorData = (await response.json()) as APIError;
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || errorData.message || "File upload failed");
      }

      return (await response.json()) as FileUploadResponse;
    } catch (error) {
      if (error instanceof Error) {
        // Ensure any error messages don't contain API keys
        const safeMessage = redactApiKey(error.message);
        if (safeMessage !== error.message) {
          throw new Error(safeMessage);
        }
        throw error;
      }
      throw new Error("Network error occurred during file upload");
    }
  }

  async associateFilesWithPersona(personaId: string, request: AssociateFilesRequest): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/personas/${personaId}/files`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }
}

// Create a singleton instance
export const api = new ToneCloneAPI();

// Export utility function for safe logging
export { redactApiKey };
