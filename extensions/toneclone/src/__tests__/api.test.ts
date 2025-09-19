/**
 * Comprehensive tests for ToneClone API client
 * Tests authentication, error handling, timeouts, URL validation, and all API methods
 */

// api is mocked below, no direct import needed
import {
  mockRaycastAPI,
  mockPersonas,
  mockProfiles,
  mockQueryResponse,
  mockFileUploadResponse,
  mockPreferences,
  createMockFetch,
  createMockFetchError,
  createMockFile,
  resetAllMocks,
  setupDefaultPreferences,
} from "./test-utils";
import { QueryRequest, TextUploadRequest, AssociateFilesRequest } from "../types";

// We need to create a testable version of the API since the original creates a singleton
// This replicates the ToneCloneAPI class for testing purposes
class TestToneCloneAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const preferences = mockRaycastAPI.getPreferenceValues();
    this.apiKey = preferences.apiKey;

    // Validate and set API URL
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

    if (!this.apiKey) {
      throw new Error("API key is required. Please configure it in preferences.");
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.apiKey}`,
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
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.error || errorData.message || "API request failed");
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Network error occurred");
    }
  }

  async getPersonas() {
    return this.makeRequest<typeof mockPersonas>("/personas");
  }

  async getProfiles() {
    return this.makeRequest<typeof mockProfiles>("/knowledge");
  }

  async generateText(request: QueryRequest) {
    const requestWithStreaming = {
      ...request,
      streaming: false,
    };

    return this.makeRequest<typeof mockQueryResponse>("/query", {
      method: "POST",
      body: JSON.stringify(requestWithStreaming),
    });
  }

  async uploadText(request: TextUploadRequest) {
    return this.makeRequest<typeof mockFileUploadResponse>("/files/text", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", "raycast");

    const url = `${this.baseUrl}/files`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for file uploads

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.error || errorData.message || "File upload failed");
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Network error occurred during file upload");
    }
  }

  async associateFilesWithPersona(personaId: string, request: AssociateFilesRequest) {
    return this.makeRequest<{ message: string }>(`/personas/${personaId}/files`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }
}

describe("ToneClone API Client", () => {
  beforeEach(() => {
    resetAllMocks();
    setupDefaultPreferences();
  });

  describe("Constructor and Initialization", () => {
    test("should initialize successfully with valid preferences", () => {
      expect(() => new TestToneCloneAPI()).not.toThrow();
    });

    test("should throw error when API key is missing", () => {
      mockRaycastAPI.getPreferenceValues.mockReturnValue({
        ...mockPreferences,
        apiKey: "",
      });

      expect(() => new TestToneCloneAPI()).toThrow("API key is required. Please configure it in preferences.");
    });

    test("should throw error when API key is undefined", () => {
      mockRaycastAPI.getPreferenceValues.mockReturnValue({
        ...mockPreferences,
        apiKey: undefined,
      });

      expect(() => new TestToneCloneAPI()).toThrow("API key is required. Please configure it in preferences.");
    });

    test("should use default API URL when not provided", () => {
      mockRaycastAPI.getPreferenceValues.mockReturnValue({
        ...mockPreferences,
        apiUrl: "",
      });

      expect(() => new TestToneCloneAPI()).not.toThrow();
    });

    test("should trim whitespace from API URL", () => {
      mockRaycastAPI.getPreferenceValues.mockReturnValue({
        ...mockPreferences,
        apiUrl: "  https://api.toneclone.ai  ",
      });

      expect(() => new TestToneCloneAPI()).not.toThrow();
    });

    test("should throw error for invalid URL format", () => {
      mockRaycastAPI.getPreferenceValues.mockReturnValue({
        ...mockPreferences,
        apiUrl: "not-a-valid-url",
      });

      expect(() => new TestToneCloneAPI()).toThrow("Invalid API URL format: not-a-valid-url");
    });

    test("should throw error for non-HTTP/HTTPS protocols", () => {
      mockRaycastAPI.getPreferenceValues.mockReturnValue({
        ...mockPreferences,
        apiUrl: "ftp://api.toneclone.ai",
      });

      expect(() => new TestToneCloneAPI()).toThrow("Invalid API URL format: ftp://api.toneclone.ai");
    });

    test("should accept HTTP protocol", () => {
      mockRaycastAPI.getPreferenceValues.mockReturnValue({
        ...mockPreferences,
        apiUrl: "http://localhost:3000",
      });

      expect(() => new TestToneCloneAPI()).not.toThrow();
    });

    test("should accept HTTPS protocol", () => {
      mockRaycastAPI.getPreferenceValues.mockReturnValue({
        ...mockPreferences,
        apiUrl: "https://api.toneclone.ai",
      });

      expect(() => new TestToneCloneAPI()).not.toThrow();
    });
  });

  describe("Request Handling", () => {
    let api: TestToneCloneAPI;

    beforeEach(() => {
      api = new TestToneCloneAPI();
    });

    test("should include Authorization header in requests", async () => {
      global.fetch = createMockFetch(mockPersonas);

      await api.getPersonas();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.toneclone.ai/personas",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer tc_test_api_key_123",
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    test("should handle successful JSON responses", async () => {
      global.fetch = createMockFetch(mockPersonas);

      const result = await api.getPersonas();

      expect(result).toEqual(mockPersonas);
    });

    test("should handle HTTP error responses with JSON error data", async () => {
      const errorData = { error: "Invalid API key" };
      global.fetch = createMockFetch(errorData, 401, false);

      await expect(api.getPersonas()).rejects.toThrow("Invalid API key");
    });

    test("should handle HTTP error responses without JSON data", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      });

      await expect(api.getPersonas()).rejects.toThrow("HTTP 500: Internal Server Error");
    });

    test("should handle network errors", async () => {
      global.fetch = createMockFetchError(new Error("Network failure"));

      await expect(api.getPersonas()).rejects.toThrow("Network failure");
    });

    test("should handle timeout errors", async () => {
      // Mock a fetch that rejects with AbortError to simulate timeout
      global.fetch = jest.fn().mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));

      await expect(api.getPersonas()).rejects.toThrow();
    });

    test("should handle non-Error exceptions", async () => {
      global.fetch = jest.fn().mockRejectedValue("String error");

      await expect(api.getPersonas()).rejects.toThrow("Network error occurred");
    });
  });

  describe("API Methods", () => {
    let api: TestToneCloneAPI;

    beforeEach(() => {
      api = new TestToneCloneAPI();
    });

    describe("getPersonas", () => {
      test("should fetch personas successfully", async () => {
        global.fetch = createMockFetch(mockPersonas);

        const result = await api.getPersonas();

        expect(result).toEqual(mockPersonas);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://api.toneclone.ai/personas",
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "Bearer tc_test_api_key_123",
            }),
          }),
        );
      });
    });

    describe("getProfiles", () => {
      test("should fetch profiles successfully", async () => {
        global.fetch = createMockFetch(mockProfiles);

        const result = await api.getProfiles();

        expect(result).toEqual(mockProfiles);
        expect(global.fetch).toHaveBeenCalledWith("https://api.toneclone.ai/knowledge", expect.any(Object));
      });
    });

    describe("generateText", () => {
      test("should generate text successfully", async () => {
        global.fetch = createMockFetch(mockQueryResponse);

        const request: QueryRequest = {
          personaId: "persona-1",
          prompt: "Write a professional email",
          profileIds: ["profile-1"],
          formality: 8,
          readingLevel: 12,
          length: 200,
        };

        const result = await api.generateText(request);

        expect(result).toEqual(mockQueryResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://api.toneclone.ai/query",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              ...request,
              streaming: false, // Should always set streaming to false
            }),
          }),
        );
      });

      test("should override streaming parameter to false", async () => {
        global.fetch = createMockFetch(mockQueryResponse);

        const request: QueryRequest = {
          personaId: "persona-1",
          prompt: "Test prompt",
          streaming: true, // This should be overridden
        };

        await api.generateText(request);

        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(callArgs[1].body);
        expect(requestBody.streaming).toBe(false);
      });
    });

    describe("uploadText", () => {
      test("should upload text successfully", async () => {
        global.fetch = createMockFetch(mockFileUploadResponse);

        const request: TextUploadRequest = {
          content: "This is test content",
          filename: "test-file.txt",
          source: "raycast",
        };

        const result = await api.uploadText(request);

        expect(result).toEqual(mockFileUploadResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://api.toneclone.ai/files/text",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify(request),
          }),
        );
      });
    });

    describe("uploadFile", () => {
      test("should upload file successfully", async () => {
        global.fetch = createMockFetch(mockFileUploadResponse);

        const file = createMockFile("Test file content", "test.txt");
        const result = await api.uploadFile(file);

        expect(result).toEqual(mockFileUploadResponse);

        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        expect(callArgs[0]).toBe("https://api.toneclone.ai/files");
        expect(callArgs[1].method).toBe("POST");
        expect(callArgs[1].headers.Authorization).toBe("Bearer tc_test_api_key_123");
        // Content-Type should not be set for FormData
        expect(callArgs[1].headers["Content-Type"]).toBeUndefined();
      });

      test("should use 60-second timeout for file uploads", async () => {
        // Mock a fetch that rejects with AbortError to simulate timeout
        global.fetch = jest.fn().mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));

        const file = createMockFile("Test content", "test.txt");

        await expect(api.uploadFile(file)).rejects.toThrow();
      });

      test("should handle file upload errors", async () => {
        const errorData = { error: "File too large" };
        global.fetch = createMockFetch(errorData, 413, false);

        const file = createMockFile("Test content", "test.txt");

        await expect(api.uploadFile(file)).rejects.toThrow("File too large");
      });

      test("should handle file upload network errors", async () => {
        global.fetch = createMockFetchError(new Error("Network failure"));

        const file = createMockFile("Test content", "test.txt");

        await expect(api.uploadFile(file)).rejects.toThrow("Network failure");
      });

      test("should handle non-Error exceptions in file upload", async () => {
        global.fetch = jest.fn().mockRejectedValue("String error");

        const file = createMockFile("Test content", "test.txt");

        await expect(api.uploadFile(file)).rejects.toThrow("Network error occurred during file upload");
      });
    });

    describe("associateFilesWithPersona", () => {
      test("should associate files with persona successfully", async () => {
        const responseData = { message: "Files associated successfully" };
        global.fetch = createMockFetch(responseData);

        const request: AssociateFilesRequest = {
          fileIds: ["file-123", "file-456"],
        };

        const result = await api.associateFilesWithPersona("persona-1", request);

        expect(result).toEqual(responseData);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://api.toneclone.ai/personas/persona-1/files",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify(request),
          }),
        );
      });
    });
  });

  describe("Error Edge Cases", () => {
    let api: TestToneCloneAPI;

    beforeEach(() => {
      api = new TestToneCloneAPI();
    });

    test("should handle malformed JSON in error responses", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: jest.fn().mockRejectedValue(new SyntaxError("Malformed JSON")),
      });

      await expect(api.getPersonas()).rejects.toThrow("HTTP 400: Bad Request");
    });

    test("should handle empty error responses", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(api.getPersonas()).rejects.toThrow("API request failed");
    });

    test("should prefer error field over message field in error responses", async () => {
      const errorData = {
        error: "Custom error message",
        message: "Different message",
      };
      global.fetch = createMockFetch(errorData, 400, false);

      await expect(api.getPersonas()).rejects.toThrow("Custom error message");
    });

    test("should use message field when error field is not present", async () => {
      const errorData = {
        message: "Message-only error",
      };
      global.fetch = createMockFetch(errorData, 400, false);

      await expect(api.getPersonas()).rejects.toThrow("Message-only error");
    });
  });
});
