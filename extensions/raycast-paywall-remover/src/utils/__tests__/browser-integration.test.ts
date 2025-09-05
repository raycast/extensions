import { describe, it, expect, vi, beforeEach } from "vitest";
import { exec } from "child_process";
import { BrowserIntegration } from "../browser-integration";

// Mock child_process
vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

// Mock promisify
vi.mock("util", () => ({
  promisify: vi.fn((fn) => fn),
}));

type ExecCallback = (error: Error | null, result?: { stdout: string; stderr: string }) => void;

describe("BrowserIntegration", () => {
  const mockExec = vi.mocked(exec);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentTabUrl", () => {
    it("should return URL from Chrome when available", async () => {
      const testUrl = "https://example.com/article";

      // Mock pgrep to show Chrome is running
      mockExec
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("pgrep")) {
            callback(null, { stdout: "12345", stderr: "" });
          }
        })
        // Mock osascript to return URL
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("osascript")) {
            callback(null, { stdout: testUrl, stderr: "" });
          }
        });

      const result = await BrowserIntegration.getCurrentTabUrl();
      expect(result).toBe(testUrl);
    });

    it("should return URL from Safari when Chrome is not available", async () => {
      const testUrl = "https://example.com/safari-article";

      // Mock pgrep to show Chrome is not running, Safari is running
      mockExec
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("Google Chrome")) {
            callback(new Error("Not running"), null);
          }
        })
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("Safari")) {
            callback(null, { stdout: "67890", stderr: "" });
          }
        })
        // Mock osascript to return URL from Safari
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("osascript")) {
            callback(null, { stdout: testUrl, stderr: "" });
          }
        });

      const result = await BrowserIntegration.getCurrentTabUrl();
      expect(result).toBe(testUrl);
    });

    it("should return null when no browsers are running", async () => {
      // Mock pgrep to show no browsers are running
      mockExec.mockImplementation((cmd: string, callback: ExecCallback) => {
        if (cmd.includes("pgrep")) {
          callback(new Error("No process found"), null);
        }
      });

      const result = await BrowserIntegration.getCurrentTabUrl();
      expect(result).toBeNull();
    });

    it("should return null when browser returns invalid URL", async () => {
      // Mock pgrep to show Chrome is running
      mockExec
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("pgrep")) {
            callback(null, { stdout: "12345", stderr: "" });
          }
        })
        // Mock osascript to return invalid URL
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("osascript")) {
            callback(null, { stdout: "not-a-valid-url", stderr: "" });
          }
        });

      const result = await BrowserIntegration.getCurrentTabUrl();
      expect(result).toBeNull();
    });

    it("should return null when browser returns empty URL", async () => {
      // Mock pgrep to show Chrome is running
      mockExec
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("pgrep")) {
            callback(null, { stdout: "12345", stderr: "" });
          }
        })
        // Mock osascript to return empty URL
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("osascript")) {
            callback(null, { stdout: "", stderr: "" });
          }
        });

      const result = await BrowserIntegration.getCurrentTabUrl();
      expect(result).toBeNull();
    });

    it("should handle AppleScript execution errors gracefully", async () => {
      // Mock pgrep to show Chrome is running
      mockExec
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("pgrep")) {
            callback(null, { stdout: "12345", stderr: "" });
          }
        })
        // Mock osascript to fail
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("osascript")) {
            callback(new Error("AppleScript error"), null);
          }
        });

      const result = await BrowserIntegration.getCurrentTabUrl();
      expect(result).toBeNull();
    });
  });

  describe("getActiveBrowser", () => {
    it("should return chrome when Chrome is active with URL", async () => {
      const testUrl = "https://example.com";

      // Mock pgrep to show Chrome is running
      mockExec
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("Google Chrome")) {
            callback(null, { stdout: "12345", stderr: "" });
          }
        })
        // Mock osascript to return URL
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("osascript")) {
            callback(null, { stdout: testUrl, stderr: "" });
          }
        });

      const result = await BrowserIntegration.getActiveBrowser();
      expect(result).toBe("chrome");
    });

    it("should return null when no browsers have active tabs", async () => {
      // Mock pgrep to show no browsers are running
      mockExec.mockImplementation((cmd: string, callback: ExecCallback) => {
        if (cmd.includes("pgrep")) {
          callback(new Error("No process found"), null);
        }
      });

      const result = await BrowserIntegration.getActiveBrowser();
      expect(result).toBeNull();
    });
  });

  describe("getCurrentTabUrlFromBrowser", () => {
    it("should return URL from specific browser", async () => {
      const testUrl = "https://example.com/firefox";

      // Mock pgrep to show Firefox is running
      mockExec
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("Firefox")) {
            callback(null, { stdout: "54321", stderr: "" });
          }
        })
        // Mock osascript to return URL
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("osascript")) {
            callback(null, { stdout: testUrl, stderr: "" });
          }
        });

      const result = await BrowserIntegration.getCurrentTabUrlFromBrowser("firefox");
      expect(result).toBe(testUrl);
    });

    it("should return null when specific browser is not running", async () => {
      // Mock pgrep to show Firefox is not running
      mockExec.mockImplementationOnce((cmd: string, callback: ExecCallback) => {
        if (cmd.includes("Firefox")) {
          callback(new Error("Not running"), null);
        }
      });

      const result = await BrowserIntegration.getCurrentTabUrlFromBrowser("firefox");
      expect(result).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      // Mock pgrep to show browser is running
      mockExec
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("pgrep")) {
            callback(null, { stdout: "12345", stderr: "" });
          }
        })
        // Mock osascript to fail
        .mockImplementationOnce((cmd: string, callback: ExecCallback) => {
          if (cmd.includes("osascript")) {
            callback(new Error("Script error"), null);
          }
        });

      const result = await BrowserIntegration.getCurrentTabUrlFromBrowser("chrome");
      expect(result).toBeNull();
    });
  });
});
