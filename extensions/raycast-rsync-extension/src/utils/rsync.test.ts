import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildRsyncCommand } from "./rsync";
import {
  TransferOptions,
  TransferDirection,
  SSHHostConfig,
} from "../types/server";
import { homedir } from "os";
import { join } from "path";
import { statSync } from "fs";
import type { PathLike } from "fs";
import * as os from "os";
import * as path from "path";

vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    statSync: vi.fn(),
  };
});

describe("Rsync Command Builder", () => {
  const mockHostConfig: SSHHostConfig = {
    host: "testserver",
    hostName: "example.com",
    user: "testuser",
    port: 22,
  };

  const configPath = join(homedir(), ".ssh", "config");

  beforeEach(() => {
    // Mock statSync to return file stats by default
    vi.mocked(statSync).mockImplementation((path: PathLike) => {
      const pathStr = path.toString();
      // Return directory stats for paths ending with "directory" or containing "/dir"
      if (
        pathStr.includes("/directory") ||
        pathStr.endsWith("directory") ||
        pathStr.includes("/dir/") ||
        pathStr === "/local/dir"
      ) {
        return {
          isDirectory: () => true,
          isFile: () => false,
        } as ReturnType<typeof statSync>;
      }
      // Return file stats for other paths
      return {
        isDirectory: () => false,
        isFile: () => true,
      } as ReturnType<typeof statSync>;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildRsyncCommand", () => {
    it("should construct upload command with correct format", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path/file.txt",
        remotePath: "/remote/path/file.txt",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // Paths should be properly escaped
      expect(command).toContain("'/local/path/file.txt'");
      expect(command).toContain("'testserver':");
      expect(command).toContain("'/remote/path/file.txt'");
      expect(command).toMatch(/rsync -e '/);
    });

    it("should construct download command with correct format", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path/destination",
        remotePath: "/remote/path/file.txt",
        direction: TransferDirection.DOWNLOAD,
      };

      const command = buildRsyncCommand(options);

      // Paths should be properly escaped
      // For downloads, local destination should have trailing slash to ensure directory is created
      expect(command).toContain("'/local/path/destination/'");
      expect(command).toContain("'testserver':");
      expect(command).toContain("'/remote/path/file.txt'");
      expect(command).toMatch(/rsync -e '/);
    });

    it("should include archive flag in command", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/directory",
        remotePath: "/remote/directory",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      expect(command).toContain("-a");
    });

    it("should include SSH config in command", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // SSH command should be escaped
      expect(command).toMatch(/rsync -e '/);
      expect(command).toContain(configPath);
    });

    it("should use host alias in command", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // Host alias should be escaped
      expect(command).toContain("'testserver':");
    });

    it("should handle different host aliases", () => {
      const customHostConfig: SSHHostConfig = {
        host: "production-server",
        hostName: "prod.example.com",
      };

      const options: TransferOptions = {
        hostConfig: customHostConfig,
        localPath: "/local/file",
        remotePath: "/remote/file",
        direction: TransferDirection.DOWNLOAD,
      };

      const command = buildRsyncCommand(options);

      // Host alias should be escaped
      expect(command).toContain("'production-server':");
    });

    it("should prevent command injection in localPath", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/tmp/test; rm -rf /",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // The malicious command should be escaped, not executed
      expect(command).toContain("'/tmp/test; rm -rf /'");
      // The semicolon should be inside single quotes (escaped), not outside
      // Check that the path is properly quoted
      expect(command).toMatch(/'\/(tmp|local)\/test; rm -rf \/'/);
    });

    it("should prevent command injection in remotePath", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path",
        remotePath: "/tmp/test | cat /etc/passwd",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // The malicious command should be escaped
      expect(command).toContain("'/tmp/test | cat /etc/passwd'");
    });

    it("should prevent command injection in hostAlias", () => {
      const maliciousHostConfig: SSHHostConfig = {
        host: "server; rm -rf /",
        hostName: "example.com",
      };

      const options: TransferOptions = {
        hostConfig: maliciousHostConfig,
        localPath: "/local/path",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // The malicious host alias should be escaped
      expect(command).toContain("'server; rm -rf /':");
    });

    it("should handle paths with spaces", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path with spaces/file.txt",
        remotePath: "/remote/path with spaces/file.txt",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // Paths with spaces should be properly escaped
      expect(command).toContain("'/local/path with spaces/file.txt'");
      expect(command).toContain("'/remote/path with spaces/file.txt'");
    });

    it("should handle paths with single quotes", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/file'name.txt",
        remotePath: "/remote/file'name.txt",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // Paths with single quotes should be properly escaped
      expect(command).toContain("'/local/file'\\''name.txt'");
      expect(command).toContain("'/remote/file'\\''name.txt'");
    });

    it("should include human-readable flag when enabled", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
        rsyncOptions: {
          humanReadable: true,
        },
      };

      const command = buildRsyncCommand(options);

      // Flag should be included in the combined flags string (e.g., -avzh)
      expect(command).toMatch(/-[avz]+h/);
    });

    it("should include progress flag when enabled", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
        rsyncOptions: {
          progress: true,
        },
      };

      const command = buildRsyncCommand(options);

      // Flag should be included in the combined flags string (e.g., -avzP)
      expect(command).toMatch(/-[avz]+P/);
    });

    it("should include delete flag when enabled", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
        rsyncOptions: {
          delete: true,
        },
      };

      const command = buildRsyncCommand(options);

      expect(command).toContain("--delete");
    });

    it("should include all optional flags when all enabled", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path",
        remotePath: "/remote/path",
        direction: TransferDirection.DOWNLOAD,
        rsyncOptions: {
          humanReadable: true,
          progress: true,
          delete: true,
        },
      };

      const command = buildRsyncCommand(options);

      // Combined short flags should include h and P (e.g., -avzhP)
      expect(command).toMatch(/-[avz]+hP/);
      expect(command).toContain("--delete");
      // Base flags should be present
      expect(command).toMatch(/-[avz]+/);
    });

    it("should not include optional flags when disabled", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
        rsyncOptions: {
          humanReadable: false,
          progress: false,
          delete: false,
        },
      };

      const command = buildRsyncCommand(options);

      // Extract the flags part (between -e and paths)
      // Note: -e argument is now escaped with single quotes
      const flagsMatch = command.match(/rsync -e '[^']+' (-[^ ]+)/);
      expect(flagsMatch).not.toBeNull();
      const flags = flagsMatch![1];

      // Optional flags should not be present
      expect(flags).not.toContain("h");
      expect(flags).not.toContain("P");
      expect(command).not.toContain("--delete");
      // Base flags should still be present
      expect(flags).toContain("a");
      expect(flags).toContain("v");
      expect(flags).toContain("z");
    });

    it("should normalize directory paths for upload - remove trailing slash from source, add to destination", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/directory",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // Source directory should not have trailing slash
      expect(command).toContain("'/local/directory'");
      expect(command).not.toContain("'/local/directory/'");
      // Destination should have trailing slash
      expect(command).toContain("'/remote/path/'");
    });

    it("should normalize directory paths for upload when source has trailing slash", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/directory/",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // Source directory should not have trailing slash (removed)
      expect(command).toContain("'/local/directory'");
      expect(command).not.toContain("'/local/directory/'");
      // Destination should have trailing slash
      expect(command).toContain("'/remote/path/'");
    });

    it("should not modify file paths for upload", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path/file.txt",
        remotePath: "/remote/path/file.txt",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // File paths should remain unchanged
      expect(command).toContain("'/local/path/file.txt'");
      expect(command).toContain("'/remote/path/file.txt'");
      expect(command).not.toContain("'/remote/path/file.txt/'");
    });

    it("should normalize paths for download - add trailing slash to local destination, remove from remote source", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path/destination",
        remotePath: "/remote/directory",
        direction: TransferDirection.DOWNLOAD,
      };

      const command = buildRsyncCommand(options);

      // Local destination should have trailing slash
      expect(command).toContain("'/local/path/destination/'");
      // Remote source should not have trailing slash
      expect(command).toContain("'/remote/directory'");
      expect(command).not.toContain("'/remote/directory/'");
    });

    it("should normalize paths for download when remote has trailing slash", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path/destination",
        remotePath: "/remote/directory/",
        direction: TransferDirection.DOWNLOAD,
      };

      const command = buildRsyncCommand(options);

      // Local destination should have trailing slash
      expect(command).toContain("'/local/path/destination/'");
      // Remote source should not have trailing slash (removed)
      expect(command).toContain("'/remote/directory'");
      expect(command).not.toContain("'/remote/directory/'");
    });

    it("should handle root path correctly", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // Root path should remain as "/" (not modified)
      expect(command).toContain("'/'");
    });

    it("should expand tilde in local paths for upload", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "~/Documents/file.txt",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // Tilde should be expanded to home directory (use homedir() to get actual path)
      const expectedPath = path.join(os.homedir(), "Documents/file.txt");
      expect(command).toContain(`'${expectedPath}'`);
      // Should not contain literal ~
      expect(command).not.toContain("'~/");
    });

    it("should expand tilde in local paths for download", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "~/Desktop",
        remotePath: "/remote/directory",
        direction: TransferDirection.DOWNLOAD,
      };

      const command = buildRsyncCommand(options);

      // Tilde should be expanded to home directory with trailing slash
      const expectedPath = path.join(os.homedir(), "Desktop") + "/";
      expect(command).toContain(`'${expectedPath}'`);
      // Should not contain literal ~
      expect(command).not.toContain("'~/");
    });

    it("should expand standalone tilde to home directory", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "~",
        remotePath: "/remote/path",
        direction: TransferDirection.DOWNLOAD,
      };

      const command = buildRsyncCommand(options);

      // Standalone tilde should be expanded to home directory with trailing slash
      const expectedPath = os.homedir() + "/";
      expect(command).toContain(`'${expectedPath}'`);
      // Should not contain literal ~
      expect(command).not.toContain("'~'");
    });
  });
});
