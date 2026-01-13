import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "node:fs";
import {
  validateLocalPath,
  validateRemotePath,
  validatePort,
  validateHostConfig,
} from "./validation";
import { SSHHostConfig } from "../types/server";

// Type definitions for mocked fs module
type MockedFS = typeof fs & {
  __setMockFileExists: (exists: boolean) => void;
};

// Mock fs module
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof fs>("node:fs");
  let mockFileExists = false;

  return {
    ...actual,
    existsSync: vi.fn(() => mockFileExists),
    __setMockFileExists: (exists: boolean) => {
      mockFileExists = exists;
    },
  };
});

describe("Validation Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fs as unknown as MockedFS).__setMockFileExists(false);
  });

  describe("validateLocalPath", () => {
    it("should return valid for existing file", () => {
      (fs as unknown as MockedFS).__setMockFileExists(true);
      const result = validateLocalPath("/path/to/file.txt");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for non-existent file", () => {
      (fs as unknown as MockedFS).__setMockFileExists(false);
      const result = validateLocalPath("/path/to/nonexistent.txt");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("File not found");
    });

    it("should return invalid for empty path", () => {
      const result = validateLocalPath("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Local path cannot be empty");
    });

    it("should return invalid for whitespace-only path", () => {
      const result = validateLocalPath("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Local path cannot be empty");
    });
  });

  describe("validateRemotePath", () => {
    it("should return valid for valid path format", () => {
      const result = validateRemotePath("/home/user/file.txt");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return valid for relative path", () => {
      const result = validateRemotePath("./documents/file.txt");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for empty path", () => {
      const result = validateRemotePath("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Remote path cannot be empty");
    });

    it("should return invalid for path with control characters", () => {
      const result = validateRemotePath("/path/with\x00null");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid path format");
    });

    it("should return invalid for path with shell metacharacters (semicolon)", () => {
      const result = validateRemotePath("/tmp/test; rm -rf /");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("shell metacharacters");
    });

    it("should return invalid for path with shell metacharacters (pipe)", () => {
      const result = validateRemotePath("/tmp/test | cat");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("shell metacharacters");
    });

    it("should return invalid for path with shell metacharacters (ampersand)", () => {
      const result = validateRemotePath("/tmp/test & echo");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("shell metacharacters");
    });

    it("should return invalid for path with shell metacharacters (backtick)", () => {
      const result = validateRemotePath("/tmp/test`whoami`");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("shell metacharacters");
    });

    it("should return invalid for path with shell metacharacters (dollar sign)", () => {
      const result = validateRemotePath("/tmp/test$HOME");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("shell metacharacters");
    });

    it("should allow parentheses in paths (legitimate filename characters)", () => {
      const result = validateRemotePath("/tmp/test(file)");
      // Parentheses are allowed as they can legitimately appear in filenames
      // and are safely handled by our escaping
      expect(result.valid).toBe(true);
    });
  });

  describe("validatePort", () => {
    it("should return valid for port in valid range", () => {
      const result = validatePort(22);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return valid for port 1", () => {
      const result = validatePort(1);
      expect(result.valid).toBe(true);
    });

    it("should return valid for port 65535", () => {
      const result = validatePort(65535);
      expect(result.valid).toBe(true);
    });

    it("should return invalid for port 0", () => {
      const result = validatePort(0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "Invalid port number: must be between 1 and 65535",
      );
    });

    it("should return invalid for port above 65535", () => {
      const result = validatePort(65536);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "Invalid port number: must be between 1 and 65535",
      );
    });

    it("should return invalid for negative port", () => {
      const result = validatePort(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "Invalid port number: must be between 1 and 65535",
      );
    });

    it("should return invalid for non-integer port", () => {
      const result = validatePort(22.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Port must be an integer");
    });
  });

  describe("validateHostConfig", () => {
    it("should return valid for complete config", () => {
      const config: SSHHostConfig = {
        host: "server1",
        hostName: "example.com",
        user: "admin",
        port: 22,
      };
      const result = validateHostConfig(config);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return valid for config without optional fields", () => {
      const config: SSHHostConfig = {
        host: "server1",
      };
      const result = validateHostConfig(config);
      expect(result.valid).toBe(true);
    });

    it("should return invalid for missing host alias", () => {
      const config: SSHHostConfig = {
        host: "",
        hostName: "example.com",
      };
      const result = validateHostConfig(config);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Host alias is required");
    });

    it("should return invalid for invalid port", () => {
      const config: SSHHostConfig = {
        host: "server1",
        port: 70000,
      };
      const result = validateHostConfig(config);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "Invalid port number: must be between 1 and 65535",
      );
    });

    it("should return invalid for null config", () => {
      const result = validateHostConfig(null as unknown as SSHHostConfig);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Host configuration is required");
    });
  });
});
