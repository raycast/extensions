import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import {
  validatePort,
  validateLocalPath,
  validateRemotePath,
  validateHostConfig,
} from "../validation";
import { SSHHostConfig } from "../../types/server";

// Type definitions for mocked fs module
type MockedFS = typeof fs & {
  __setMockFileExists: (exists: boolean) => void;
  __setMockStats: (stats: fs.Stats | null) => void;
};

// Mock fs module
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof fs>("node:fs");
  let mockFileExists = false;
  let mockStats: fs.Stats | null = null;

  return {
    ...actual,
    existsSync: vi.fn(() => mockFileExists),
    statSync: vi.fn(() => {
      if (!mockStats) {
        throw new Error("File not found");
      }
      return mockStats;
    }),
    __setMockFileExists: (exists: boolean) => {
      mockFileExists = exists;
    },
    __setMockStats: (stats: fs.Stats | null) => {
      mockStats = stats;
    },
  };
});

describe("validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fs as unknown as MockedFS).__setMockFileExists(false);
    (fs as unknown as MockedFS).__setMockStats(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validatePort", () => {
    it("should return valid for valid ports", () => {
      expect(validatePort(22).valid).toBe(true);
      expect(validatePort(80).valid).toBe(true);
      expect(validatePort(443).valid).toBe(true);
      expect(validatePort(8080).valid).toBe(true);
      expect(validatePort(65535).valid).toBe(true);
      expect(validatePort(1).valid).toBe(true);
    });

    it("should return invalid for invalid ports", () => {
      expect(validatePort(0).valid).toBe(false);
      expect(validatePort(-1).valid).toBe(false);
      expect(validatePort(65536).valid).toBe(false);
      expect(validatePort(100000).valid).toBe(false);
      expect(validatePort(22.5).valid).toBe(false);
      expect(validatePort(NaN).valid).toBe(false);
    });
  });

  describe("validateLocalPath", () => {
    it("should return valid if path exists", () => {
      (fs as unknown as MockedFS).__setMockFileExists(true);
      const result = validateLocalPath("/valid/path");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid if path does not exist", () => {
      (fs as unknown as MockedFS).__setMockFileExists(false);
      const result = validateLocalPath("/invalid/path");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("File not found");
    });

    it("should return invalid for empty paths", () => {
      const result = validateLocalPath("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Local path cannot be empty");
    });

    it("should handle whitespace", () => {
      (fs as unknown as MockedFS).__setMockFileExists(true);
      const result = validateLocalPath("  /path  ");
      expect(result.valid).toBe(true);
    });
  });

  describe("validateRemotePath", () => {
    it("should return valid for non-empty paths", () => {
      expect(validateRemotePath("/home/user").valid).toBe(true);
      expect(validateRemotePath("file.txt").valid).toBe(true);
      expect(validateRemotePath("/path/to/file").valid).toBe(true);
    });

    it("should return invalid for empty paths", () => {
      expect(validateRemotePath("").valid).toBe(false);
      expect(validateRemotePath("   ").valid).toBe(false);
    });

    it("should handle whitespace", () => {
      expect(validateRemotePath("  /path  ").valid).toBe(true);
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
  });
});
