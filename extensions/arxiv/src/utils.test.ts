import { parseResponse, ArxivParseError } from "./utils";
import {
  mockXMLResponse,
  mockXMLResponseEmpty,
  mockXMLResponseMalformed,
  mockXMLResponseMissingFields,
} from "./test/fixtures";
import { showFailureToast } from "@raycast/utils";

jest.mock("@raycast/utils");

describe("XML Parser Utils", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to keep test output clean
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {
      // Intentionally empty to suppress console output during tests
    });
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {
      // Intentionally empty to suppress console output during tests
    });
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("parseResponse", () => {
    it("should parse valid XML response correctly", async () => {
      const response = new Response(mockXMLResponse, {
        status: 200,
        statusText: "OK",
      });

      const results = await parseResponse(response);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        title: "Deep Learning for Natural Language Processing: A Survey",
        authors: ["John Doe", "Jane Smith", "Bob Johnson"],
        category: "cs.CL, cs.AI",
        published: "2023-01-15T10:30:00Z",
        updated: "2023-01-20T14:00:00Z",
        summary: "This paper provides a comprehensive survey of deep learning techniques for NLP.",
        doi: "10.1234/example.doi",
        comment: "Accepted at ICML 2023",
        journalRef: "Proceedings of ICML 2023",
        abstractUrl: "https://arxiv.org/abs/2301.12345",
        pdfUrl: "http://arxiv.org/pdf/2301.12345v1",
        texUrl: "https://arxiv.org/e-print/2301.12345",
        htmlUrl: "https://ar5iv.org/abs/2301.12345",
      });
    });

    it("should handle empty search results", async () => {
      const response = new Response(mockXMLResponseEmpty, {
        status: 200,
        statusText: "OK",
      });

      const results = await parseResponse(response);

      expect(results).toEqual([]);
      expect(showFailureToast).not.toHaveBeenCalled();
    });

    it("should handle missing fields gracefully", async () => {
      const response = new Response(mockXMLResponseMissingFields, {
        status: 200,
        statusText: "OK",
      });

      const results = await parseResponse(response);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        title: "Paper Without Authors or Summary",
        authors: [],
        category: "cs.LG",
        published: "2023-01-15T10:30:00Z",
        summary: undefined,
        doi: undefined,
        comment: undefined,
        journalRef: undefined,
      });
    });

    it("should handle non-200 responses", async () => {
      const response = new Response("", {
        status: 404,
        statusText: "Not Found",
      });

      await expect(parseResponse(response)).rejects.toThrow(ArxivParseError);
      expect(showFailureToast).toHaveBeenCalledWith("Search Failed", {
        message: "Unable to connect to arXiv. Please try again later.",
      });
      // Verify error was logged (but suppressed from output)
      expect(consoleErrorSpy).toHaveBeenCalledWith("arXiv API error: 404 Not Found");
    });

    it("should handle empty response body", async () => {
      const response = new Response("", {
        status: 200,
        statusText: "OK",
      });

      const results = await parseResponse(response);
      expect(results).toEqual([]);
      // Verify warning was logged (but suppressed from output)
      expect(consoleWarnSpy).toHaveBeenCalledWith("Empty response from arXiv API");
    });

    it("should handle malformed XML", async () => {
      const response = new Response(mockXMLResponseMalformed, {
        status: 200,
        statusText: "OK",
      });

      await expect(parseResponse(response)).rejects.toThrow(ArxivParseError);
      expect(showFailureToast).toHaveBeenCalledWith("Search Error", {
        message: "Failed to process search results. Please try again.",
      });
    });

    it("should handle invalid XML structure", async () => {
      const response = new Response("<root>Not a feed</root>", {
        status: 200,
        statusText: "OK",
      });

      await expect(parseResponse(response)).rejects.toThrow(ArxivParseError);
      expect(showFailureToast).toHaveBeenCalledWith("Parse Error", {
        message: "Received invalid data from arXiv. Please try again.",
      });
    });

    it("should validate and sanitize arXiv IDs", async () => {
      const xmlWithInvalidId = mockXMLResponse.replace("2301.12345", "../../etc/passwd");
      const response = new Response(xmlWithInvalidId, {
        status: 200,
        statusText: "OK",
      });

      const results = await parseResponse(response);

      expect(results[0].abstractUrl).toBe("https://arxiv.org/abs/etc/passwd");
      expect(results[0].abstractUrl).not.toContain("../");
    });

    it("should handle old format arXiv IDs", async () => {
      const xmlWithOldId = mockXMLResponse.replace("2301.12345", "math.GT/0605123");
      const response = new Response(xmlWithOldId, {
        status: 200,
        statusText: "OK",
      });

      const results = await parseResponse(response);

      expect(results[0].abstractUrl).toBe("https://arxiv.org/abs/math.GT/0605123");
      expect(results[0].texUrl).toBe("https://arxiv.org/e-print/math.GT/0605123");
      expect(results[0].htmlUrl).toBe("https://ar5iv.org/abs/math.GT/0605123");
    });

    it("should extract multiple categories", async () => {
      const response = new Response(mockXMLResponse, {
        status: 200,
        statusText: "OK",
      });

      const results = await parseResponse(response);
      expect(results[0].category).toBe("cs.CL, cs.AI");
    });

    it("should handle missing PDF link", async () => {
      const xmlWithoutPDF = mockXMLResponse.replace(/<link[^>]*rel="related"[^>]*\/>/g, "");
      const response = new Response(xmlWithoutPDF, {
        status: 200,
        statusText: "OK",
      });

      const results = await parseResponse(response);
      expect(results[0].pdfUrl).toBe("");
      expect(results[0].link).toBe("");
    });

    it("should clean newlines from summary", async () => {
      const xmlWithNewlines = mockXMLResponse.replace(
        "This paper provides a comprehensive survey of deep learning techniques for NLP.",
        "This paper provides\na comprehensive survey\nof deep learning techniques\nfor NLP."
      );
      const response = new Response(xmlWithNewlines, {
        status: 200,
        statusText: "OK",
      });

      const results = await parseResponse(response);
      expect(results[0].summary).toBe(
        "This paper provides a comprehensive survey of deep learning techniques for NLP."
      );
    });
  });

  describe("ArxivParseError", () => {
    it("should create error with message", () => {
      const error = new ArxivParseError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("ArxivParseError");
    });

    it("should create error with original error", () => {
      const originalError = new Error("Original");
      const error = new ArxivParseError("Wrapped error", originalError);
      expect(error.message).toBe("Wrapped error");
      expect(error.originalError).toBe(originalError);
    });

    it("should be instanceof Error", () => {
      const error = new ArxivParseError("Test");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ArxivParseError);
    });
  });
});
