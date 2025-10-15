import { apiClient } from "../lib/api-client";

// Mock getPreferenceValues
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(() => ({
    personalAccessToken: "test-token",
  })),
}));

describe("ApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe("GET requests", () => {
    it("should make successful GET request", async () => {
      const mockData = { id: "1", name: "Test" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn(() => "application/json"),
        },
        text: jest.fn().mockResolvedValue(JSON.stringify(mockData)),
      });

      const result = await apiClient.get("/test");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.nokotime.com/v2/test",
        {
          method: "GET",
          headers: {
            "X-NokoToken": "test-token",
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );

      expect(result).toEqual({
        success: true,
        data: mockData,
      });
    });

    it("should handle HTTP error responses", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: {
          get: jest.fn(() => "application/json"),
        },
        text: jest.fn().mockResolvedValue("Not Found"),
      });

      const result = await apiClient.get("/test");

      expect(result).toEqual({
        success: false,
        error: "HTTP 404: Not Found",
      });
    });

    it("should handle network errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await apiClient.get("/test");

      expect(result).toEqual({
        success: false,
        error: "Network error",
      });
    });

    it("should handle empty responses", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn(() => "application/json"),
        },
        text: jest.fn().mockResolvedValue(""),
      });

      const result = await apiClient.get("/test");

      expect(result).toEqual({
        success: true,
        data: {},
      });
    });

    it("should handle invalid JSON responses", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn(() => "application/json"),
        },
        text: jest.fn().mockResolvedValue("invalid json"),
      });

      const result = await apiClient.get("/test");

      expect(result).toEqual({
        success: false,
        error: "Failed to parse JSON response",
      });
    });
  });

  describe("POST requests", () => {
    it("should make successful POST request with data", async () => {
      const mockData = { name: "Test Project" };
      const responseData = { id: "1", ...mockData };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn(() => "application/json"),
        },
        text: jest.fn().mockResolvedValue(JSON.stringify(responseData)),
      });

      const result = await apiClient.post("/projects", mockData);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.nokotime.com/v2/projects",
        {
          method: "POST",
          headers: {
            "X-NokoToken": "test-token",
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(mockData),
        },
      );

      expect(result).toEqual({
        success: true,
        data: responseData,
      });
    });

    it("should make POST request without data", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn(() => "application/json"),
        },
        text: jest.fn().mockResolvedValue("{}"),
      });

      const result = await apiClient.post("/test");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.nokotime.com/v2/test",
        {
          method: "POST",
          headers: {
            "X-NokoToken": "test-token",
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: undefined,
        },
      );

      expect(result.success).toBe(true);
    });
  });

  describe("PUT requests", () => {
    it("should make successful PUT request", async () => {
      const mockData = { description: "Updated description" };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn(() => "application/json"),
        },
        text: jest.fn().mockResolvedValue(JSON.stringify(mockData)),
      });

      const result = await apiClient.put("/projects/1/timer/log", mockData);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.nokotime.com/v2/projects/1/timer/log",
        {
          method: "PUT",
          headers: {
            "X-NokoToken": "test-token",
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(mockData),
        },
      );

      expect(result).toEqual({
        success: true,
        data: mockData,
      });
    });
  });

  describe("DELETE requests", () => {
    it("should make successful DELETE request", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn(() => "application/json"),
        },
        text: jest.fn().mockResolvedValue(""),
      });

      const result = await apiClient.delete("/projects/1/timer");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.nokotime.com/v2/projects/1/timer",
        {
          method: "DELETE",
          headers: {
            "X-NokoToken": "test-token",
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );

      expect(result).toEqual({
        success: true,
        data: {},
      });
    });
  });
});
