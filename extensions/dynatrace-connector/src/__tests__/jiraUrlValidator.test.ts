import {
  parseJiraUrl,
  isValidJiraUrl,
  getJiraUrlError,
  getJiraTokenType,
  extractCloudId,
  buildScopedTokenUrl,
  buildJiraUrlFromCloudId,
} from "../lib/utils/jiraUrlValidator";

describe("jiraUrlValidator", () => {
  describe("parseJiraUrl", () => {
    it("should parse unscoped token URLs", () => {
      const result = parseJiraUrl("https://yaroslavsubscriptions.atlassian.net");
      expect(result).toEqual({
        tokenType: "unscoped",
        baseUrl: "https://yaroslavsubscriptions.atlassian.net",
        isValid: true,
      });
    });

    it("should parse unscoped token URLs with trailing slash", () => {
      const result = parseJiraUrl("https://yaroslavsubscriptions.atlassian.net/");
      expect(result).toEqual({
        tokenType: "unscoped",
        baseUrl: "https://yaroslavsubscriptions.atlassian.net",
        isValid: true,
      });
    });

    it("should parse scoped token URLs", () => {
      const result = parseJiraUrl("https://api.atlassian.com/ex/jira/abc123def456");
      expect(result).toEqual({
        tokenType: "scoped",
        baseUrl: "https://api.atlassian.com/ex/jira/abc123def456",
        cloudId: "abc123def456",
        isValid: true,
      });
    });

    it("should parse scoped token URLs with trailing slash", () => {
      const result = parseJiraUrl("https://api.atlassian.com/ex/jira/abc123def456/");
      expect(result).toEqual({
        tokenType: "scoped",
        baseUrl: "https://api.atlassian.com/ex/jira/abc123def456",
        cloudId: "abc123def456",
        isValid: true,
      });
    });

    it("should handle empty URL", () => {
      const result = parseJiraUrl("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle undefined URL", () => {
      const result = parseJiraUrl(undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject invalid scoped URL without cloud ID", () => {
      const result = parseJiraUrl("https://api.atlassian.com/ex/jira/");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject malformed URLs", () => {
      const result = parseJiraUrl("not-a-url");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("isValidJiraUrl", () => {
    it("should return true for valid unscoped URLs", () => {
      expect(isValidJiraUrl("https://mysite.atlassian.net")).toBe(true);
    });

    it("should return true for valid scoped URLs", () => {
      expect(isValidJiraUrl("https://api.atlassian.com/ex/jira/abc123")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(isValidJiraUrl("invalid-url")).toBe(false);
    });

    it("should return false for empty URL", () => {
      expect(isValidJiraUrl("")).toBe(false);
    });
  });

  describe("getJiraUrlError", () => {
    it("should return undefined for valid URLs", () => {
      expect(getJiraUrlError("https://mysite.atlassian.net")).toBeUndefined();
    });

    it("should return error message for invalid URLs", () => {
      const error = getJiraUrlError("invalid");
      expect(error).toBeDefined();
      expect(typeof error).toBe("string");
    });
  });

  describe("getJiraTokenType", () => {
    it("should return 'unscoped' for unscoped URLs", () => {
      expect(getJiraTokenType("https://mysite.atlassian.net")).toBe("unscoped");
    });

    it("should return 'scoped' for scoped URLs", () => {
      expect(getJiraTokenType("https://api.atlassian.com/ex/jira/abc123")).toBe("scoped");
    });
  });

  describe("extractCloudId", () => {
    it("should extract cloud ID from scoped URLs", () => {
      expect(extractCloudId("https://api.atlassian.com/ex/jira/abc123def456")).toBe("abc123def456");
    });

    it("should return undefined for unscoped URLs", () => {
      expect(extractCloudId("https://mysite.atlassian.net")).toBeUndefined();
    });

    it("should return undefined for invalid URLs", () => {
      expect(extractCloudId("invalid")).toBeUndefined();
    });
  });

  describe("buildScopedTokenUrl", () => {
    it("should build scoped token URL from cloud ID", () => {
      const url = buildScopedTokenUrl("abc123def456");
      expect(url).toBe("https://api.atlassian.com/ex/jira/abc123def456");
    });

    it("should throw error for empty cloud ID", () => {
      expect(() => buildScopedTokenUrl("")).toThrow();
    });
  });

  describe("buildJiraUrlFromCloudId", () => {
    it("should build URL from valid cloud ID", () => {
      const result = buildJiraUrlFromCloudId("e6f310ff-605a-4f7c-b043-5d591d075292");
      expect(result.isValid).toBe(true);
      expect(result.url).toBe("https://api.atlassian.com/ex/jira/e6f310ff-605a-4f7c-b043-5d591d075292");
    });

    it("should reject invalid UUID format", () => {
      const result = buildJiraUrlFromCloudId("not-a-valid-uuid");
      expect(result.isValid).toBe(false);
    });

    it("should handle empty cloud ID", () => {
      const result = buildJiraUrlFromCloudId("");
      expect(result.isValid).toBe(false);
    });
  });
});
