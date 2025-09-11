import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPreferenceValues } from "@raycast/api";
import { PaywallServiceClient } from "../service-client";

// Mock is set up in setup.ts
const mockGetPreferenceValues = vi.mocked(getPreferenceValues);

describe("PaywallServiceClient - Configuration Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Service URL Configuration", () => {
    it("should use default service URL when no preference is set", () => {
      // Requirement 3.3: Use default service when no custom URL configured
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "",
      });

      const client = new PaywallServiceClient();
      expect(client.getServiceUrl()).toBe("https://open.bolha.tools");
      expect(client.isUsingDefaultService()).toBe(true);
    });

    it("should use configured service URL when valid preference is set", () => {
      // Requirement 3.1: Access extension preferences for service URL
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "https://custom-service.com",
      });

      const client = new PaywallServiceClient();
      expect(client.getServiceUrl()).toBe("https://custom-service.com");
      expect(client.isUsingDefaultService()).toBe(false);
    });

    it("should normalize service URL by adding https protocol", () => {
      // Requirement 3.2: Validate URL format for paywall service
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "custom-service.com",
      });

      const client = new PaywallServiceClient();
      expect(client.getServiceUrl()).toBe("https://custom-service.com");
    });

    it("should remove trailing slash from service URL", () => {
      // Requirement 3.5: Service URL format validation
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "https://custom-service.com/",
      });

      const client = new PaywallServiceClient();
      expect(client.getServiceUrl()).toBe("https://custom-service.com");
    });

    it("should fall back to default when invalid URL is configured", () => {
      // Requirement 3.3: Use default service when configured URL is invalid
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "not-a-valid-url",
      });

      const client = new PaywallServiceClient();
      expect(client.getServiceUrl()).toBe("https://open.bolha.tools");
      expect(client.isUsingDefaultService()).toBe(true);
    });
  });

  describe("Service URL Validation", () => {
    beforeEach(() => {
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "https://test.com",
      });
    });

    it("should validate correct HTTPS URLs", () => {
      // Requirement 3.2: Validate URL format for paywall service
      const client = new PaywallServiceClient();
      const result = client.validateServiceUrl("https://example.com");

      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe("https://example.com");
      expect(result.supportsPattern).toBe(true);
    });

    it("should validate correct HTTP URLs", () => {
      // Requirement 3.2: Validate URL format for paywall service
      const client = new PaywallServiceClient();
      const result = client.validateServiceUrl("http://example.com");

      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe("http://example.com");
    });

    it("should add HTTPS protocol to URLs without protocol", () => {
      // Requirement 3.5: Service URL format validation
      const client = new PaywallServiceClient();
      const result = client.validateServiceUrl("example.com");

      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe("https://example.com");
    });

    it("should reject empty or null URLs", () => {
      // Requirement 3.2: Validate URL format for paywall service
      const client = new PaywallServiceClient();

      const emptyResult = client.validateServiceUrl("");
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.error).toContain("cannot be empty");

      const nullResult = client.validateServiceUrl(null as unknown as string);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.error).toContain("must be a string");
    });

    it("should reject URLs with invalid protocols", () => {
      // Requirement 3.2: Validate URL format for paywall service
      const client = new PaywallServiceClient();
      const result = client.validateServiceUrl("ftp://example.com");

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("HTTP or HTTPS protocol");
    });

    it("should reject malformed URLs", () => {
      // Requirement 3.5: Service URL format validation
      const client = new PaywallServiceClient();
      const result = client.validateServiceUrl("not-a-url");

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid URL format");
    });

    it("should handle URLs with whitespace", () => {
      // Requirement 3.5: Service URL format validation
      const client = new PaywallServiceClient();
      const result = client.validateServiceUrl("  https://example.com  ");

      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe("https://example.com");
    });
  });

  describe("Configuration Management", () => {
    beforeEach(() => {
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "https://configured.com",
      });
    });

    it("should provide configuration status", () => {
      // Requirement 3.1: Provide configuration status information
      const client = new PaywallServiceClient();
      const status = client.getConfigurationStatus();

      expect(status.serviceUrl).toBe("https://configured.com");
      expect(status.isDefault).toBe(false);
      expect(status.isValid).toBe(true);
      expect(status.source).toBe("configured");
    });

    it("should show default configuration status", () => {
      // Requirement 3.3: Identify when default service is being used
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "",
      });

      const client = new PaywallServiceClient();
      const status = client.getConfigurationStatus();

      expect(status.serviceUrl).toBe("https://open.bolha.tools");
      expect(status.isDefault).toBe(true);
      expect(status.source).toBe("default");
    });

    it("should update service URL at runtime", () => {
      // Requirement 3.2: Allow service URL configuration updates
      const client = new PaywallServiceClient();
      const newUrl = "https://new-service.com";

      const result = client.updateServiceUrl(newUrl);
      expect(result.isValid).toBe(true);
      expect(client.getServiceUrl()).toBe(newUrl);
    });

    it("should reject invalid URL updates", () => {
      // Requirement 3.2: Validate URL format during updates
      const client = new PaywallServiceClient();
      const originalUrl = client.getServiceUrl();

      const result = client.updateServiceUrl("invalid-url");
      expect(result.isValid).toBe(false);
      expect(client.getServiceUrl()).toBe(originalUrl); // Should remain unchanged
    });

    it("should refresh configuration from preferences", () => {
      // Requirement 3.1: Re-read preferences when needed
      const client = new PaywallServiceClient();
      expect(client.getServiceUrl()).toBe("https://configured.com");

      // Change mock to return different preference
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "https://updated.com",
      });

      client.refreshConfiguration();
      expect(client.getServiceUrl()).toBe("https://updated.com");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined preferences gracefully", () => {
      // Requirement 3.3: Use default service when preferences are undefined
      mockGetPreferenceValues.mockReturnValue({});

      const client = new PaywallServiceClient();
      expect(client.getServiceUrl()).toBe("https://open.bolha.tools");
      expect(client.isUsingDefaultService()).toBe(true);
    });

    it("should handle preferences with only whitespace", () => {
      // Requirement 3.5: Handle whitespace-only URLs
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "   ",
      });

      const client = new PaywallServiceClient();
      expect(client.getServiceUrl()).toBe("https://open.bolha.tools");
      expect(client.isUsingDefaultService()).toBe(true);
    });

    it("should preserve HTTP protocol when explicitly specified", () => {
      // Requirement 3.2: Respect explicit HTTP protocol choice
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "http://localhost:3000",
      });

      const client = new PaywallServiceClient();
      expect(client.getServiceUrl()).toBe("http://localhost:3000");
    });
  });

  describe("Paywall Removal Service Integration", () => {
    beforeEach(() => {
      mockGetPreferenceValues.mockReturnValue({
        paywallServiceUrl: "https://test-service.com",
      });
    });

    describe("URL Formatting", () => {
      it("should format URLs correctly for paywall service", () => {
        // Requirement 3.4: Format URLs for paywall service integration
        const client = new PaywallServiceClient();
        const targetUrl = "https://example.com/article";
        const result = client.formatUrlForService(targetUrl);

        const expectedUrl = "https://test-service.com/" + targetUrl;
        expect(result).toBe(expectedUrl);
      });

      it("should properly format URLs with query parameters", () => {
        // Requirement 5.1: Proper URL formatting for service endpoint pattern
        const client = new PaywallServiceClient();
        const targetUrl = "https://example.com/article?id=123&ref=social";
        const result = client.formatUrlForService(targetUrl);

        const expectedUrl = "https://test-service.com/" + targetUrl;
        expect(result).toBe(expectedUrl);
        expect(result).toContain("?id=123&ref=social"); // Plain query parameters
      });

      it("should handle URLs with special characters", () => {
        // Requirement 5.1: Handle various URL formats
        const client = new PaywallServiceClient();
        const targetUrl = "https://example.com/article-with-dashes_and_underscores";
        const result = client.formatUrlForService(targetUrl);

        const expectedUrl = "https://test-service.com/" + targetUrl;
        expect(result).toBe(expectedUrl);
      });

      it("should reject empty or invalid target URLs", () => {
        // Requirement 5.1: URL validation for paywall processing
        const client = new PaywallServiceClient();

        expect(() => client.formatUrlForService("")).toThrow("Target URL is required");
        expect(() => client.formatUrlForService("not-a-url")).toThrow("Invalid target URL format");
        expect(() => client.formatUrlForService("ftp://example.com")).toThrow("Invalid target URL format");
      });

      it("should accept both HTTP and HTTPS URLs", () => {
        // Requirement 5.1: Support both HTTP and HTTPS protocols
        const client = new PaywallServiceClient();

        const httpsUrl = "https://example.com/article";
        const httpUrl = "http://example.com/article";

        expect(() => client.formatUrlForService(httpsUrl)).not.toThrow();
        expect(() => client.formatUrlForService(httpUrl)).not.toThrow();
      });
    });

    describe("Paywall Removal", () => {
      it("should successfully process valid URLs", async () => {
        // Requirement 3.4: Paywall removal service integration
        const client = new PaywallServiceClient();
        const targetUrl = "https://example.com/article";

        const result = await client.removePaywall(targetUrl);
        const expectedUrl = "https://test-service.com/" + targetUrl;
        expect(result).toBe(expectedUrl);
      });

      it("should handle errors gracefully", async () => {
        // Requirement 4.3: Error handling for service connectivity issues
        const client = new PaywallServiceClient();

        await expect(client.removePaywall("")).rejects.toThrow("Failed to process URL for paywall removal");
        await expect(client.removePaywall("invalid-url")).rejects.toThrow("Failed to process URL for paywall removal");
      });

      it("should preserve original error messages", async () => {
        // Requirement 5.1: Handle service errors gracefully
        const client = new PaywallServiceClient();

        try {
          await client.removePaywall("");
        } catch (error) {
          expect(error.message).toContain("Target URL is required");
        }
      });
    });

    describe("Service Information", () => {
      it("should provide service endpoint information", () => {
        // Requirement 3.4: Provide service endpoint details
        const client = new PaywallServiceClient();
        const info = client.getServiceInfo();

        expect(info.url).toBe("https://test-service.com");
        expect(info.isDefault).toBe(false);
        expect(info.pattern).toBe("https://test-service.com/[TARGET_URL]");
        expect(info.example).toContain("https://test-service.com/");
        expect(info.example).toContain("https://example.com/article");
      });

      it("should indicate when using default service", () => {
        // Requirement 3.4: Service configuration status
        mockGetPreferenceValues.mockReturnValue({
          paywallServiceUrl: "",
        });

        const client = new PaywallServiceClient();
        const info = client.getServiceInfo();

        expect(info.url).toBe("https://open.bolha.tools");
        expect(info.isDefault).toBe(true);
      });
    });

    describe("Service Connectivity", () => {
      it("should test service connectivity successfully", async () => {
        // Requirement 4.3: Service connectivity validation
        const client = new PaywallServiceClient();
        const result = await client.testServiceConnectivity();

        expect(result.isReachable).toBe(true);
        expect(result.responseTime).toBeGreaterThan(0);
        expect(result.error).toBeUndefined();
      });

      it("should handle connectivity test failures", async () => {
        // Requirement 4.3: Handle service connectivity issues
        // Create a client with valid config first
        const client = new PaywallServiceClient();

        // Then update to an invalid URL that will cause formatUrlForService to fail
        const result = client.updateServiceUrl("https://valid-but-will-fail.com");
        expect(result.isValid).toBe(true);

        // Mock formatUrlForService to throw an error to simulate connectivity failure
        const originalFormatUrl = client.formatUrlForService;
        client.formatUrlForService = vi.fn().mockImplementation(() => {
          throw new Error("Service unreachable");
        });

        const connectivityResult = await client.testServiceConnectivity();

        expect(connectivityResult.isReachable).toBe(false);
        expect(connectivityResult.error).toBeDefined();
        expect(connectivityResult.responseTime).toBeUndefined();

        // Restore original method
        client.formatUrlForService = originalFormatUrl;
      });
    });

    describe("Edge Cases and Error Handling", () => {
      it("should handle URLs with fragments and anchors", () => {
        // Requirement 5.1: Handle various URL formats
        const client = new PaywallServiceClient();
        const targetUrl = "https://example.com/article#section1";
        const result = client.formatUrlForService(targetUrl);

        expect(result).toContain("#section1");
      });

      it("should handle very long URLs", () => {
        // Requirement 5.1: Handle edge cases
        const client = new PaywallServiceClient();
        const longPath = "a".repeat(1000);
        const targetUrl = `https://example.com/${longPath}`;

        expect(() => client.formatUrlForService(targetUrl)).not.toThrow();
      });

      it("should handle URLs with international characters", () => {
        // Requirement 5.1: Handle various URL formats
        const client = new PaywallServiceClient();
        const targetUrl = "https://example.com/文章";
        const result = client.formatUrlForService(targetUrl);

        expect(result).toContain("https://test-service.com/");
        expect(result).toContain("文章");
      });

      it("should handle null and undefined inputs gracefully", () => {
        // Requirement 5.1: Input validation
        const client = new PaywallServiceClient();

        expect(() => client.formatUrlForService(null as unknown as string)).toThrow("Target URL is required");
        expect(() => client.formatUrlForService(undefined as unknown as string)).toThrow("Target URL is required");
      });
    });
  });
});
