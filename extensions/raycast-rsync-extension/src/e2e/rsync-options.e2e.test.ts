import { describe, it, expect } from "vitest";
import { buildRsyncCommand } from "../utils/rsync";
import {
  TransferOptions,
  TransferDirection,
  SSHHostConfig,
} from "../types/server";
import { homedir } from "os";
import { join } from "path";

describe("Rsync Options E2E", () => {
  const mockHostConfig: SSHHostConfig = {
    host: "testserver",
    hostName: "test.example.com",
    user: "testuser",
    port: 22,
  };

  const configPath = join(homedir(), ".ssh", "config");

  describe("Rsync flags and options", () => {
    it("should include base flags (-avz) by default", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
      };

      const command = buildRsyncCommand(options);

      // Base flags are combined into -avz
      expect(command).toContain("-avz");
      // Verify individual flags are present in the combined string
      expect(command).toMatch(/-[avz]+/);
      // Command now uses single quotes for escaping
      const flagsMatch = command.match(/rsync -e '[^']+' (-[^ ]+)/);
      expect(flagsMatch).not.toBeNull();
      const flags = flagsMatch![1];
      expect(flags).toContain("a"); // archive
      expect(flags).toContain("v"); // verbose
      expect(flags).toContain("z"); // compress
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
      // Command now uses single quotes for escaping
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
  });

  describe("Progress and output message handling", () => {
    it("should build command with progress flag for real-time updates", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/file.txt",
        remotePath: "/remote/file.txt",
        direction: TransferDirection.UPLOAD,
        rsyncOptions: {
          progress: true,
          humanReadable: true,
        },
      };

      const command = buildRsyncCommand(options);

      // Should include both progress and human-readable flags
      expect(command).toMatch(/-[avz]+hP/);
      // Paths are now escaped with single quotes
      expect(command).toContain("'/local/file.txt'");
      expect(command).toContain("'testserver':");
      expect(command).toContain("'/remote/file.txt'");
    });

    it("should handle upload with all options enabled", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/directory",
        remotePath: "/remote/directory",
        direction: TransferDirection.UPLOAD,
        rsyncOptions: {
          humanReadable: true,
          progress: true,
          delete: true,
        },
      };

      const command = buildRsyncCommand(options);

      // Command now uses single quotes for escaping
      expect(command).toMatch(
        /^rsync -e 'ssh -F .+' -[avz]+hP --delete .+ 'testserver':.+$/,
      );
      expect(command).toContain("'/local/directory'");
      expect(command).toContain("'/remote/directory'");
    });

    it("should handle download with all options enabled", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/destination",
        remotePath: "/remote/source",
        direction: TransferDirection.DOWNLOAD,
        rsyncOptions: {
          humanReadable: true,
          progress: true,
          delete: true,
        },
      };

      const command = buildRsyncCommand(options);

      // Command now uses single quotes for escaping
      expect(command).toMatch(
        /^rsync -e 'ssh -F .+' -[avz]+hP --delete 'testserver':.+ .+$/,
      );
      expect(command).toContain("'testserver':");
      expect(command).toContain("'/remote/source'");
      // For downloads, local destination should have trailing slash to ensure directory is created
      expect(command).toContain("'/local/destination/'");
    });
  });

  describe("Rsync options workflow", () => {
    it("should validate workflow with human-readable option", () => {
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
      expect(command).toMatch(/-[avz]+h/);
      expect(command).toContain(configPath);
    });

    it("should validate workflow with progress option", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path",
        remotePath: "/remote/path",
        direction: TransferDirection.DOWNLOAD,
        rsyncOptions: {
          progress: true,
        },
      };

      const command = buildRsyncCommand(options);
      expect(command).toMatch(/-[avz]+P/);
      expect(command).toContain(configPath);
    });

    it("should validate workflow with delete option", () => {
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
      expect(command).toContain(configPath);
    });

    it("should handle partial options (only some enabled)", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/path",
        remotePath: "/remote/path",
        direction: TransferDirection.UPLOAD,
        rsyncOptions: {
          humanReadable: true,
          progress: false,
          delete: false,
        },
      };

      const command = buildRsyncCommand(options);
      expect(command).toMatch(/-[avz]+h/);
      expect(command).not.toContain("P");
      expect(command).not.toContain("--delete");
    });
  });

  describe("Command structure with options", () => {
    it("should maintain correct command structure with options", () => {
      const options: TransferOptions = {
        hostConfig: mockHostConfig,
        localPath: "/local/file.txt",
        remotePath: "/remote/file.txt",
        direction: TransferDirection.UPLOAD,
        rsyncOptions: {
          humanReadable: true,
          progress: true,
        },
      };

      const command = buildRsyncCommand(options);

      // Verify command structure: rsync -e 'ssh -F config' flags source dest
      // Command now uses single quotes for escaping
      expect(command).toMatch(
        /^rsync -e 'ssh -F .+' -[avz]+hP .+ 'testserver':.+$/,
      );
    });

    it("should handle long-form flags correctly", () => {
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

      // --delete should appear after short flags
      expect(command).toMatch(/-avz --delete/);
    });

    it("should combine short and long flags correctly", () => {
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

      // Should have short flags combined, then long flags
      expect(command).toMatch(/-[avz]+hP --delete/);
    });
  });
});
