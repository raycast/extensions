import { describe, it, expect, vi, beforeEach } from "vitest";
import { OnePasswordCLI } from "./cli-wrapper";
import { exec } from "child_process";

vi.mock("child_process");
vi.mock("@raycast/api");

const mockExec = vi.mocked(exec);

describe("OnePasswordCLI", () => {
  let cli: OnePasswordCLI;

  beforeEach(() => {
    vi.clearAllMocks();
    cli = new OnePasswordCLI();
  });

  describe("readApiKey", () => {
    const mockItemResponse = {
      id: "abc123",
      title: "cli-openai",
      vault: { name: "Employee" },
      fields: [
        {
          id: "username",
          label: "username",
          type: "STRING",
          value: "testuser",
        },
        {
          id: "credentials",
          label: "credentials",
          type: "CONCEALED",
          value: "sk-1234567890",
        },
      ],
    };

    it("should extract credentials field when it exists", async () => {
      mockExec.mockImplementation((cmd, callback: any) => {
        if (cmd.includes("item get")) {
          callback(null, JSON.stringify(mockItemResponse), "");
        } else {
          callback(null, "", "");
        }
      });

      const result = await cli.readApiKey("abc123");
      expect(result).toBe("sk-1234567890");
    });

    it("should handle different field labels for API keys", async () => {
      const variations = [
        { label: "API Key", expectedValue: "sk-test-key" },
        { label: "api_key", expectedValue: "sk-test-key2" },
        { label: "token", expectedValue: "token-123" },
        { label: "secret", expectedValue: "secret-456" },
        { label: "password", expectedValue: "pass-789" },
      ];

      for (const variant of variations) {
        const mockItem = {
          ...mockItemResponse,
          fields: [
            {
              id: "field1",
              label: variant.label,
              type: "CONCEALED",
              value: variant.expectedValue,
            },
          ],
        };

        mockExec.mockImplementation((cmd, callback: any) => {
          callback(null, JSON.stringify(mockItem), "");
        });

        const result = await cli.readApiKey("abc123");
        expect(result).toBe(variant.expectedValue);
      }
    });

    it("should handle item with no credentials field but has concealed field", async () => {
      const mockItem = {
        ...mockItemResponse,
        fields: [
          {
            id: "username",
            label: "username",
            type: "STRING",
            value: "user",
          },
          {
            id: "some-secret",
            label: "Secret Value",
            type: "CONCEALED",
            value: "hidden-value",
          },
        ],
      };

      mockExec.mockImplementation((cmd, callback: any) => {
        callback(null, JSON.stringify(mockItem), "");
      });

      const result = await cli.readApiKey("abc123");
      expect(result).toBe("hidden-value");
    });

    it("should throw error when no credential field is found", async () => {
      const mockItem = {
        ...mockItemResponse,
        fields: [
          {
            id: "username",
            label: "username",
            type: "STRING",
            value: "user",
          },
        ],
      };

      mockExec.mockImplementation((cmd, callback: any) => {
        callback(null, JSON.stringify(mockItem), "");
      });

      await expect(cli.readApiKey("abc123")).rejects.toThrow(
        "No credential field found",
      );
    });

    it("should handle op command errors gracefully", async () => {
      mockExec.mockImplementation((cmd, callback: any) => {
        callback(new Error("item not found"), "", "");
      });

      await expect(cli.readApiKey("abc123")).rejects.toThrow(
        "Failed to read secret",
      );
    });

    it("should not use op read command with references", async () => {
      mockExec.mockImplementation((cmd, callback: any) => {
        // Ensure we're not using the op read command with references
        expect(cmd).not.toContain('op read "op://');
        callback(null, JSON.stringify(mockItemResponse), "");
      });

      await cli.readApiKey("abc123");
    });
  });

  describe("real-world item structure", () => {
    it("should handle 1Password API Credential item structure", async () => {
      // This represents actual 1Password API Credential structure
      const realItem = {
        id: "xyz789",
        title: "GitHub API",
        category: "API_CREDENTIAL",
        vault: { id: "vault123", name: "Development" },
        fields: [
          {
            id: "username",
            type: "STRING",
            label: "username",
            value: "api-user",
          },
          {
            id: "credential",
            type: "CONCEALED",
            label: "credential",
            value: "ghp_1234567890abcdef",
          },
          {
            id: "type",
            type: "STRING",
            label: "type",
            value: "bearer",
          },
          {
            id: "filename",
            type: "STRING",
            label: "filename",
            value: ".env",
          },
          {
            id: "validFrom",
            type: "DATE",
            label: "valid from",
            value: "1234567890",
          },
          {
            id: "expires",
            type: "DATE",
            label: "expires",
            value: "1234567890",
          },
          {
            id: "notesPlain",
            type: "STRING",
            label: "notes",
            value: "API key for GitHub",
          },
        ],
      };

      mockExec.mockImplementation((cmd, callback: any) => {
        callback(null, JSON.stringify(realItem), "");
      });

      const result = await cli.readApiKey("xyz789");
      expect(result).toBe("ghp_1234567890abcdef");
    });

    it("should handle item with credentials in lowercase", async () => {
      // Based on the actual error: cli-openai item might have 'credentials' field
      const openAIItem = {
        id: "openai123",
        title: "cli-openai",
        category: "API_CREDENTIAL",
        vault: { name: "Employee" },
        fields: [
          {
            id: "credentials",
            type: "CONCEALED",
            label: "credentials",
            value: "sk-openai-key-123",
          },
        ],
      };

      mockExec.mockImplementation((cmd, callback: any) => {
        expect(cmd).toContain("item get");
        callback(null, JSON.stringify(openAIItem), "");
      });

      const result = await cli.readApiKey("openai123");
      expect(result).toBe("sk-openai-key-123");
    });
  });
});
