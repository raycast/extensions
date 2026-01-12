import { describe, it, expect } from "vitest";
import { buildRsyncCommand } from "./rsync";
import {
  TransferOptions,
  TransferDirection,
  SSHHostConfig,
} from "../types/server";
import { homedir } from "os";
import { join } from "path";

describe("Rsync Command Builder", () => {
  const mockHostConfig: SSHHostConfig = {
    host: "testserver",
    hostName: "example.com",
    user: "testuser",
    port: 22,
  };

  const configPath = join(homedir(), ".ssh", "config");

  describe("buildRsyncCommand", () => {
    it("should construct upload command with correct format", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path/file.txt",
        remotePath: "/remote/path/file.txt",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      expect(command).toBe(
        `rsync -e "ssh -F ${configPath}" -avz /local/path/file.txt testserver:/remote/path/file.txt`,
      );
    });

    it("should construct download command with correct format", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path/destination",
        remotePath: "/remote/path/file.txt",
        direction: TransferDirection.DOWNLOAD,
      };

      const command = buildRsyncCommand(options);

      expect(command).toBe(
        `rsync -e "ssh -F ${configPath}" -avz testserver:/remote/path/file.txt /local/path/destination`,
      );
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

      expect(command).toContain(`-e "ssh -F ${configPath}"`);
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

      expect(command).toContain("testserver:");
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

      expect(command).toContain("production-server:");
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
      const flagsMatch = command.match(/rsync -e "[^"]+" (-[^ ]+)/);
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
  });
});
