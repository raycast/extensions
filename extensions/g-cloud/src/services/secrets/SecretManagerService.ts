/**
 * Secret Manager Service - Provides efficient access to Google Cloud Secret Manager functionality
 * Uses REST APIs for improved performance (no CLI subprocess overhead)
 */

import {
  listSecrets as apiListSecrets,
  getSecret as apiGetSecret,
  listSecretVersions as apiListVersions,
  accessSecretVersion as apiAccessVersion,
  createSecret as apiCreateSecret,
  deleteSecret as apiDeleteSecret,
  gcpPost,
  SECRETS_API,
  type Secret as ApiSecret,
  type SecretVersion as ApiSecretVersion,
} from "../../utils/gcpApi";

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
 * Now uses REST APIs instead of gcloud CLI for better performance
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
   * Convert API secret to internal format
   */
  private convertSecret(apiSecret: ApiSecret): Secret {
    return {
      name: apiSecret.name,
      createTime: apiSecret.createTime,
      labels: apiSecret.labels,
      replication: apiSecret.replication as Secret["replication"],
    };
  }

  /**
   * Convert API secret version to internal format
   */
  private convertVersion(apiVersion: ApiSecretVersion): SecretVersion {
    return {
      name: apiVersion.name,
      createTime: apiVersion.createTime,
      destroyTime: apiVersion.destroyTime,
      state: apiVersion.state,
    };
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

    // Use REST API instead of gcloud CLI
    const apiSecrets = await apiListSecrets(this.gcloudPath, this.projectId);
    const secrets = apiSecrets.map((s) => this.convertSecret(s));

    // Cache the results
    this.secretsCache.set(cacheKey, { data: secrets, timestamp: Date.now() });

    return secrets;
  }

  /**
   * Get detailed information about a specific secret
   */
  async describeSecret(secretId: string): Promise<Secret> {
    // Use REST API instead of gcloud CLI
    const apiSecret = await apiGetSecret(this.gcloudPath, this.projectId, secretId);
    return this.convertSecret(apiSecret);
  }

  /**
   * List all versions of a secret
   */
  async listVersions(secretId: string): Promise<SecretVersion[]> {
    // Use REST API instead of gcloud CLI
    const apiVersions = await apiListVersions(this.gcloudPath, this.projectId, secretId);
    return apiVersions.map((v) => this.convertVersion(v));
  }

  /**
   * Create a new secret with initial value
   * SECURITY: Never log the data parameter
   */
  async createSecret(secretId: string, data: string): Promise<void> {
    // Use REST API instead of gcloud CLI
    await apiCreateSecret(this.gcloudPath, this.projectId, secretId, data);

    // Clear cache
    this.clearCache();
  }

  /**
   * Add a new version to an existing secret
   * SECURITY: Never log the data parameter
   */
  async addVersion(secretId: string, data: string): Promise<void> {
    // Use REST API to add version
    const url = `${SECRETS_API}/projects/${this.projectId}/secrets/${secretId}:addVersion`;
    await gcpPost(this.gcloudPath, url, {
      payload: {
        data: Buffer.from(data).toString("base64"),
      },
    });
  }

  /**
   * Access a secret version's value
   * SECURITY: This method returns sensitive data - handle with care
   */
  async accessVersion(secretId: string, version: string = "latest"): Promise<string> {
    // Use REST API instead of gcloud CLI
    return await apiAccessVersion(this.gcloudPath, this.projectId, secretId, version);
  }

  /**
   * Delete a secret
   */
  async deleteSecret(secretId: string): Promise<void> {
    // Use REST API instead of gcloud CLI
    await apiDeleteSecret(this.gcloudPath, this.projectId, secretId);

    // Clear cache
    this.clearCache();
  }

  /**
   * Destroy a specific version of a secret
   */
  async destroyVersion(secretId: string, version: string): Promise<void> {
    // Use REST API
    const url = `${SECRETS_API}/projects/${this.projectId}/secrets/${secretId}/versions/${version}:destroy`;
    await gcpPost(this.gcloudPath, url, {});
  }

  /**
   * Disable a specific version of a secret
   */
  async disableVersion(secretId: string, version: string): Promise<void> {
    // Use REST API
    const url = `${SECRETS_API}/projects/${this.projectId}/secrets/${secretId}/versions/${version}:disable`;
    await gcpPost(this.gcloudPath, url, {});
  }

  /**
   * Enable a specific version of a secret
   */
  async enableVersion(secretId: string, version: string): Promise<void> {
    // Use REST API
    const url = `${SECRETS_API}/projects/${this.projectId}/secrets/${secretId}/versions/${version}:enable`;
    await gcpPost(this.gcloudPath, url, {});
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.secretsCache.clear();
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
