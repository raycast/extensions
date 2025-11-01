/**
 * Secret Manager Service - Provides efficient access to Google Cloud Secret Manager functionality
 * Optimized for performance and security
 */

import { executeGcloudCommand } from "../../gcloud";
import { showFailureToast } from "@raycast/utils";

// Interfaces
export interface Secret {
  name: string;
  createTime: string;
  labels?: Record<string, string>;
  replication?: {
    automatic?: {
      customerManagedEncryption?: {
        kmsKeyName: string;
      };
    };
    userManaged?: {
      replicas: Array<{
        location: string;
        customerManagedEncryption?: {
          kmsKeyName: string;
        };
      }>;
    };
  };
  etag?: string;
  topics?: Array<{
    name: string;
  }>;
  expireTime?: string;
  ttl?: string;
  rotation?: {
    nextRotationTime: string;
    rotationPeriod: string;
  };
  versionAliases?: Record<string, string>;
}

export interface SecretVersion {
  name: string;
  createTime: string;
  destroyTime?: string;
  state: "ENABLED" | "DISABLED" | "DESTROYED";
  replicationStatus?: {
    automatic?: {
      customerManagedEncryption?: {
        kmsKeyVersionName: string;
      };
    };
    userManaged?: {
      replicas: Array<{
        location: string;
        customerManagedEncryption?: {
          kmsKeyVersionName: string;
        };
      }>;
    };
  };
  etag?: string;
}

export interface SecretMetadata {
  secret: Secret;
  versionCount?: number;
  latestVersion?: string;
}

/**
 * Secret Manager Service class - provides optimized access to Secret Manager functionality
 */
export class SecretManagerService {
  private gcloudPath: string;
  private projectId: string;
  private secretsCache: Map<string, { data: Secret[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes cache TTL for metadata only

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  /**
   * List all secrets in the project
   */
  async listSecrets(useCache: boolean = true): Promise<Secret[]> {
    const cacheKey = `secrets-${this.projectId}`;

    if (useCache) {
      const cached = this.secretsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    try {
      const result = (await executeGcloudCommand(this.gcloudPath, "secrets list", this.projectId)) as Secret[];

      const secrets: Secret[] = Array.isArray(result) ? result : [];

      // Cache the results
      this.secretsCache.set(cacheKey, { data: secrets, timestamp: Date.now() });

      return secrets;
    } catch (error) {
      console.error("Failed to list secrets:", error);
      showFailureToast({
        title: "Failed to list secrets",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return [];
    }
  }

  /**
   * Get detailed information about a specific secret
   */
  async describeSecret(secretId: string): Promise<Secret | null> {
    try {
      const result = (await executeGcloudCommand(
        this.gcloudPath,
        `secrets describe ${secretId}`,
        this.projectId,
      )) as Secret;

      return result || null;
    } catch (error) {
      console.error("Failed to describe secret:", error);
      showFailureToast({
        title: "Failed to get secret details",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return null;
    }
  }

  /**
   * List all versions of a secret
   */
  async listVersions(secretId: string): Promise<SecretVersion[]> {
    try {
      const result = (await executeGcloudCommand(
        this.gcloudPath,
        `secrets versions list ${secretId}`,
        this.projectId,
      )) as SecretVersion[];

      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Failed to list secret versions:", error);
      showFailureToast({
        title: "Failed to list versions",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return [];
    }
  }

  /**
   * Create a new secret with initial value
   * SECURITY: Never log the data parameter
   */
  async createSecret(secretId: string, data: string): Promise<boolean> {
    try {
      // First create the secret
      await this.executeGcloudCommandWithInput(`secrets create ${secretId}`, data);

      // Clear cache
      this.clearCache();

      return true;
    } catch (error) {
      console.error("Failed to create secret");
      showFailureToast({
        title: "Failed to create secret",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    }
  }

  /**
   * Add a new version to an existing secret
   * SECURITY: Never log the data parameter
   */
  async addVersion(secretId: string, data: string): Promise<boolean> {
    try {
      await this.executeGcloudCommandWithInput(`secrets versions add ${secretId}`, data);

      return true;
    } catch (error) {
      console.error("Failed to add secret version");
      showFailureToast({
        title: "Failed to add version",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    }
  }

  /**
   * Access a secret version's value
   * SECURITY: This method returns sensitive data - handle with care
   */
  async accessVersion(secretId: string, version: string = "latest"): Promise<string | null> {
    try {
      const command = `secrets versions access ${version} --secret ${secretId}`;
      const result = await this.executeGcloudCommandWithOutput(command);
      return result;
    } catch (error) {
      console.error("Failed to access secret version");
      showFailureToast({
        title: "Failed to access secret",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return null;
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(secretId: string): Promise<boolean> {
    try {
      await executeGcloudCommand(this.gcloudPath, `secrets delete ${secretId} --quiet`, this.projectId);

      // Clear cache
      this.clearCache();

      return true;
    } catch (error) {
      console.error("Failed to delete secret:", error);
      showFailureToast({
        title: "Failed to delete secret",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    }
  }

  /**
   * Destroy a specific version of a secret
   */
  async destroyVersion(secretId: string, version: string): Promise<boolean> {
    try {
      await executeGcloudCommand(
        this.gcloudPath,
        `secrets versions destroy ${version} --secret ${secretId} --quiet`,
        this.projectId,
      );

      return true;
    } catch (error) {
      console.error("Failed to destroy version:", error);
      showFailureToast({
        title: "Failed to destroy version",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    }
  }

  /**
   * Disable a specific version of a secret
   */
  async disableVersion(secretId: string, version: string): Promise<boolean> {
    try {
      await executeGcloudCommand(
        this.gcloudPath,
        `secrets versions disable ${version} --secret ${secretId}`,
        this.projectId,
      );

      return true;
    } catch (error) {
      console.error("Failed to disable version:", error);
      showFailureToast({
        title: "Failed to disable version",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    }
  }

  /**
   * Enable a specific version of a secret
   */
  async enableVersion(secretId: string, version: string): Promise<boolean> {
    try {
      await executeGcloudCommand(
        this.gcloudPath,
        `secrets versions enable ${version} --secret ${secretId}`,
        this.projectId,
      );

      return true;
    } catch (error) {
      console.error("Failed to enable version:", error);
      showFailureToast({
        title: "Failed to enable version",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.secretsCache.clear();
  }

  /**
   * Execute gcloud command with input via stdin
   * SECURITY: Never log the input parameter
   */
  private async executeGcloudCommandWithInput(command: string, input: string): Promise<void> {
    const { spawn } = await import("child_process");

    return new Promise((resolve, reject) => {
      const args = command.split(" ").concat(["--project", this.projectId, "--data-file=-"]);
      const child = spawn(this.gcloudPath, args, { stdio: ["pipe", "pipe", "pipe"] });

      let stderr = "";

      child.stdout.on("data", () => {
        // Output not needed for creation operations
      });

      child.stderr.on("data", (data) => {
        stderr += data;
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          if (stderr.includes("already exists")) {
            reject(new Error("A secret with this name already exists"));
          } else {
            reject(new Error(stderr || `Command failed with exit code ${code}`));
          }
        }
      });

      child.on("error", (error) => {
        reject(error);
      });

      // Write input to stdin
      child.stdin.write(input);
      child.stdin.end();
    });
  }

  /**
   * Execute gcloud command and return raw output (for secret values)
   * SECURITY: This method returns sensitive data - handle with care
   */
  private async executeGcloudCommandWithOutput(command: string): Promise<string | null> {
    const { spawn } = await import("child_process");

    return new Promise((resolve, reject) => {
      const args = command.split(" ").concat(["--project", this.projectId]);
      const child = spawn(this.gcloudPath, args, { stdio: ["pipe", "pipe", "pipe"] });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data;
      });

      child.stderr.on("data", (data) => {
        stderr += data;
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout || null);
        } else {
          reject(new Error(stderr || `Command failed with exit code ${code}`));
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  /**
   * Extract secret ID from full resource name
   */
  static extractSecretId(resourceName: string): string {
    // Format: projects/PROJECT_ID/secrets/SECRET_ID
    const parts = resourceName.split("/");
    return parts[parts.length - 1];
  }

  /**
   * Extract version ID from full version name
   */
  static extractVersionId(versionName: string): string {
    // Format: projects/PROJECT_ID/secrets/SECRET_ID/versions/VERSION
    const parts = versionName.split("/");
    return parts[parts.length - 1];
  }

  /**
   * Format creation timestamp to relative time
   */
  static formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  }
}
