import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  validateLocalPath,
  validateRemotePath,
  validateHostConfig,
} from "../utils/validation";
import { buildRsyncCommand } from "../utils/rsync";
import {
  TransferDirection,
  TransferOptions,
  SSHHostConfig,
} from "../types/server";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

describe("Upload E2E Flow", () => {
  let testLocalFile: string;
  let testDir: string;

  beforeAll(() => {
    // Create test directory
    testDir = path.join(os.tmpdir(), "rsync-e2e-test-" + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    // Create test local file
    testLocalFile = path.join(testDir, "test-file.txt");
    fs.writeFileSync(testLocalFile, "Test content for upload");
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should complete full upload workflow with valid inputs", () => {
    // This test verifies the complete upload workflow
    // After successful execution, the UI will call popToRoot() to close the extension

    // Step 1: Create mock host config
    const testHost: SSHHostConfig = {
      host: "testserver",
      hostName: "test.example.com",
      user: "testuser",
      port: 2222,
      identityFile: "~/.ssh/test_key",
    };

    // Step 2: Validate local path
    const localValidation = validateLocalPath(testLocalFile);
    expect(localValidation.valid).toBe(true);
    expect(localValidation.error).toBeUndefined();

    // Step 3: Validate remote path
    const remotePath = "/remote/destination/file.txt";
    const remoteValidation = validateRemotePath(remotePath);
    expect(remoteValidation.valid).toBe(true);
    expect(remoteValidation.error).toBeUndefined();

    // Step 4: Validate host config
    const hostValidation = validateHostConfig(testHost);
    expect(hostValidation.valid).toBe(true);
    expect(hostValidation.error).toBeUndefined();

    // Step 5: Build rsync command
    const options: TransferOptions = {
      hostConfig: testHost,
      localPath: testLocalFile,
      remotePath: remotePath,
      direction: TransferDirection.UPLOAD,
    };

    const command = buildRsyncCommand(options);
    expect(command).toContain("rsync");
    expect(command).toContain("-a");
    expect(command).toContain("testserver:");
    expect(command).toContain(testLocalFile);
    expect(command).toContain(remotePath);
  });

  it("should handle missing local file error in upload workflow", () => {
    // Try to validate non-existent local path
    const nonExistentPath = "/path/that/does/not/exist.txt";
    const localValidation = validateLocalPath(nonExistentPath);

    // Should fail validation
    expect(localValidation.valid).toBe(false);
    expect(localValidation.error).toBeDefined();
    expect(localValidation.error).toContain("File not found");
  });

  it("should handle invalid remote path in upload workflow", () => {
    // Validate local path (should pass)
    const localValidation = validateLocalPath(testLocalFile);
    expect(localValidation.valid).toBe(true);

    // Try to validate invalid remote path (empty)
    const remoteValidation = validateRemotePath("");

    // Should fail validation
    expect(remoteValidation.valid).toBe(false);
    expect(remoteValidation.error).toBeDefined();
    expect(remoteValidation.error).toContain("cannot be empty");
  });

  it("should handle invalid port in host config", () => {
    // Create host with invalid port
    const invalidHost: SSHHostConfig = {
      host: "testserver",
      hostName: "test.example.com",
      port: 99999,
    };

    // Validate host config
    const hostValidation = validateHostConfig(invalidHost);

    // Should fail validation
    expect(hostValidation.valid).toBe(false);
    expect(hostValidation.error).toBeDefined();
    expect(hostValidation.error).toContain("must be between 1 and 65535");
  });

  it("should validate all inputs before allowing transfer", () => {
    const testHost: SSHHostConfig = {
      host: "testserver",
      hostName: "test.example.com",
      user: "testuser",
      port: 22,
    };

    // All validations should pass
    const localValidation = validateLocalPath(testLocalFile);
    const remoteValidation = validateRemotePath("/remote/path");
    const hostValidation = validateHostConfig(testHost);

    expect(localValidation.valid).toBe(true);
    expect(remoteValidation.valid).toBe(true);
    expect(hostValidation.valid).toBe(true);

    // Should be able to create transfer options
    const options: TransferOptions = {
      hostConfig: testHost,
      localPath: testLocalFile,
      remotePath: "/remote/path",
      direction: TransferDirection.UPLOAD,
    };

    expect(options).toBeDefined();
    expect(options.direction).toBe(TransferDirection.UPLOAD);
  });

  it("should handle directory upload", () => {
    // Create test directory with files
    const testSubDir = path.join(testDir, "test-dir");
    fs.mkdirSync(testSubDir, { recursive: true });
    fs.writeFileSync(path.join(testSubDir, "file1.txt"), "Content 1");
    fs.writeFileSync(path.join(testSubDir, "file2.txt"), "Content 2");

    // Validate directory path
    const localValidation = validateLocalPath(testSubDir);
    expect(localValidation.valid).toBe(true);

    // Create options for directory upload
    const testHost: SSHHostConfig = {
      host: "testserver",
      hostName: "test.example.com",
    };

    const options: TransferOptions = {
      hostConfig: testHost,
      localPath: testSubDir,
      remotePath: "/remote/dir",
      direction: TransferDirection.UPLOAD,
    };

    const command = buildRsyncCommand(options);
    expect(command).toContain("-a");
    expect(command).toContain(testSubDir);
  });

  it("should build correct rsync command for upload", () => {
    const testHost: SSHHostConfig = {
      host: "production",
      hostName: "prod.example.com",
      user: "produser",
      port: 2222,
    };

    const options: TransferOptions = {
      hostConfig: testHost,
      localPath: testLocalFile,
      remotePath: "/var/www/file.txt",
      direction: TransferDirection.UPLOAD,
    };

    const command = buildRsyncCommand(options);

    // Verify command structure
    expect(command).toMatch(/^rsync -e "ssh -F .+" -avz .+ production:.+$/);
    expect(command).toContain(testLocalFile);
    expect(command).toContain("/var/www/file.txt");
  });
});
