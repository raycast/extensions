import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { validateRemotePath, validateHostConfig } from "../utils/validation";
import { buildRsyncCommand } from "../utils/rsync";
import {
  TransferDirection,
  TransferOptions,
  SSHHostConfig,
} from "../types/server";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

describe("Download E2E Flow", () => {
  let testLocalDir: string;

  beforeAll(() => {
    // Create test directory for downloads
    testLocalDir = path.join(os.tmpdir(), "rsync-e2e-download-" + Date.now());
    fs.mkdirSync(testLocalDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testLocalDir)) {
      fs.rmSync(testLocalDir, { recursive: true, force: true });
    }
  });

  it("should complete full download workflow with valid inputs", () => {
    // This test verifies the complete download workflow
    // After successful execution, the UI will call popToRoot() to close the extension

    // Step 1: Create mock host config
    const downloadHost: SSHHostConfig = {
      host: "downloadserver",
      hostName: "download.example.com",
      user: "downloaduser",
      port: 22,
      identityFile: "~/.ssh/download_key",
    };

    // Step 2: Validate remote path
    const remotePath = "/remote/source/file.txt";
    const remoteValidation = validateRemotePath(remotePath);
    expect(remoteValidation.valid).toBe(true);
    expect(remoteValidation.error).toBeUndefined();

    // Step 3: Validate host config
    const hostValidation = validateHostConfig(downloadHost);
    expect(hostValidation.valid).toBe(true);
    expect(hostValidation.error).toBeUndefined();

    // Step 4: Build rsync command
    const options: TransferOptions = {
      hostConfig: downloadHost,
      localPath: testLocalDir,
      remotePath: remotePath,
      direction: TransferDirection.DOWNLOAD,
    };

    const command = buildRsyncCommand(options);
    expect(command).toContain("rsync");
    expect(command).toContain("-a");
    expect(command).toContain("downloadserver:");
    expect(command).toContain(remotePath);
    expect(command).toContain(testLocalDir);
  });

  it("should handle empty remote path in download workflow", () => {
    // Try to validate empty remote path
    const remoteValidation = validateRemotePath("");

    // Should fail validation
    expect(remoteValidation.valid).toBe(false);
    expect(remoteValidation.error).toBeDefined();
    expect(remoteValidation.error).toContain("cannot be empty");
  });

  it("should handle invalid remote path with control characters", () => {
    // Try to validate remote path with control characters
    const invalidPath = "/remote/path\x00/file.txt";
    const remoteValidation = validateRemotePath(invalidPath);

    // Should fail validation
    expect(remoteValidation.valid).toBe(false);
    expect(remoteValidation.error).toBeDefined();
    expect(remoteValidation.error).toContain("control characters");
  });

  it("should validate all inputs before allowing download", () => {
    const downloadHost: SSHHostConfig = {
      host: "downloadserver",
      hostName: "download.example.com",
      user: "downloaduser",
    };

    // All validations should pass
    const remoteValidation = validateRemotePath("/remote/file.txt");
    const hostValidation = validateHostConfig(downloadHost);

    expect(remoteValidation.valid).toBe(true);
    expect(hostValidation.valid).toBe(true);

    // Should be able to create transfer options
    const options: TransferOptions = {
      hostConfig: downloadHost,
      localPath: testLocalDir,
      remotePath: "/remote/file.txt",
      direction: TransferDirection.DOWNLOAD,
    };

    expect(options).toBeDefined();
    expect(options.direction).toBe(TransferDirection.DOWNLOAD);
  });

  it("should handle directory download", () => {
    const downloadHost: SSHHostConfig = {
      host: "downloadserver",
      hostName: "download.example.com",
    };

    const remoteDir = "/remote/directory";
    const remoteValidation = validateRemotePath(remoteDir);
    expect(remoteValidation.valid).toBe(true);

    const options: TransferOptions = {
      hostConfig: downloadHost,
      localPath: testLocalDir,
      remotePath: remoteDir,
      direction: TransferDirection.DOWNLOAD,
    };

    const command = buildRsyncCommand(options);
    expect(command).toContain("-a");
    expect(command).toContain(remoteDir);
  });

  it("should handle host without optional properties", () => {
    const backupServer: SSHHostConfig = {
      host: "backup-server",
      hostName: "backup.example.com",
      user: "backupuser",
    };

    // Should validate successfully even without port and identityFile
    const hostValidation = validateHostConfig(backupServer);
    expect(hostValidation.valid).toBe(true);
  });

  it("should handle various remote path formats", () => {
    const validPaths = [
      "/absolute/path/file.txt",
      "relative/path/file.txt",
      "/path/with spaces/file.txt",
      "/path/with-dashes/file.txt",
      "/path/with_underscores/file.txt",
      "/path/with.dots/file.txt",
      "~/home/path/file.txt",
    ];

    validPaths.forEach((remotePath) => {
      const validation = validateRemotePath(remotePath);
      expect(validation.valid).toBe(true);
    });
  });

  it("should build correct rsync command for download", () => {
    const downloadHost: SSHHostConfig = {
      host: "backup",
      hostName: "backup.example.com",
      user: "backupuser",
      port: 2222,
    };

    const options: TransferOptions = {
      hostConfig: downloadHost,
      localPath: testLocalDir,
      remotePath: "/backup/data.tar.gz",
      direction: TransferDirection.DOWNLOAD,
    };

    const command = buildRsyncCommand(options);

    // Verify command structure
    expect(command).toMatch(/^rsync -e "ssh -F .+" -avz backup:.+ .+$/);
    expect(command).toContain("/backup/data.tar.gz");
    expect(command).toContain(testLocalDir);
  });
});
