import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  GetObjectCommandOutput,
  GetBucketLocationCommand,
  S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ConnectionProfile, S3Object, S3Bucket } from "../types";
import { ProfileManager } from "./profile-manager";
import { createReadStream } from "fs";

export class S3Manager {
  private clients: Map<string, S3Client> = new Map();
  private bucketRegions: Map<string, string> = new Map();

  async getClient(profileId: string): Promise<S3Client> {
    if (!this.clients.has(profileId)) {
      const profile = await this.getProfile(profileId);

      const clientConfig: S3ClientConfig = {
        region: profile.region || "us-east-1",
        credentials: {
          accessKeyId: profile.accessKeyId,
          secretAccessKey: profile.secretAccessKey,
          ...(profile.sessionToken && { sessionToken: profile.sessionToken }),
        },
      };

      // Add custom endpoint for S3-compatible services
      if (profile.endpoint) {
        clientConfig.endpoint = profile.endpoint;
        // Force path-style addressing for custom endpoints
        clientConfig.forcePathStyle = true;
      }

      const client = new S3Client(clientConfig);
      this.clients.set(profileId, client);
    }
    return this.clients.get(profileId)!;
  }

  async getClientForBucket(profileId: string, bucketName: string): Promise<S3Client> {
    try {
      // First, try to get the bucket region if we don't have it cached
      if (!this.bucketRegions.has(bucketName)) {
        const defaultClient = await this.getClient(profileId);

        try {
          const locationCommand = new GetBucketLocationCommand({ Bucket: bucketName });
          const locationResponse = await defaultClient.send(locationCommand);

          // AWS returns null for us-east-1, so handle that case
          const bucketRegion = locationResponse.LocationConstraint || "us-east-1";
          this.bucketRegions.set(bucketName, bucketRegion);
        } catch (error) {
          // If we can't get the bucket location, fall back to the default client
          console.warn(`Could not determine region for bucket ${bucketName}, using default client:`, error);
          return defaultClient;
        }
      }

      const bucketRegion = this.bucketRegions.get(bucketName)!;
      const clientKey = `${profileId}_${bucketRegion}`;

      // Create a region-specific client if we don't have one
      if (!this.clients.has(clientKey)) {
        const profile = await this.getProfile(profileId);

        const clientConfig: S3ClientConfig = {
          region: bucketRegion,
          credentials: {
            accessKeyId: profile.accessKeyId,
            secretAccessKey: profile.secretAccessKey,
            ...(profile.sessionToken && { sessionToken: profile.sessionToken }),
          },
        };

        // Add custom endpoint for S3-compatible services
        if (profile.endpoint) {
          clientConfig.endpoint = profile.endpoint;
          clientConfig.forcePathStyle = true;
        }

        const client = new S3Client(clientConfig);
        this.clients.set(clientKey, client);
      }

      return this.clients.get(clientKey)!;
    } catch (error) {
      // Fallback to the default client if region detection fails
      console.warn(`Failed to get region-specific client for bucket ${bucketName}, using default:`, error);
      return await this.getClient(profileId);
    }
  }

  async getProfile(profileId: string): Promise<ConnectionProfile> {
    try {
      const profile = await ProfileManager.getProfileById(profileId);
      if (!profile) {
        throw new Error(`Profile ${profileId} not found`);
      }
      return profile;
    } catch (error) {
      throw new Error(`Failed to load profile: ${error}`);
    }
  }

  async listBuckets(profileId: string): Promise<S3Bucket[]> {
    const client = await this.getClient(profileId);

    try {
      const command = new ListBucketsCommand({});
      const response = await client.send(command);

      if (!response.Buckets) {
        return [];
      }

      // Get the client's region for bucket region info
      const profile = await this.getProfile(profileId);
      const defaultRegion = profile.region || "us-east-1";

      return response.Buckets.map((bucket) => ({
        name: bucket.Name!,
        creationDate: bucket.CreationDate!,
        region: this.bucketRegions.get(bucket.Name!) || defaultRegion, // Use cached region if available
        objectCount: undefined, // This would require additional API calls per bucket
      }));
    } catch (error) {
      throw new Error(`Failed to list buckets: ${error}`);
    }
  }

  async listObjects(profileId: string, bucket: string, prefix?: string): Promise<S3Object[]> {
    const client = await this.getClientForBucket(profileId, bucket);

    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: "/", // This helps identify "folders" (common prefixes)
        MaxKeys: 1000,
      });

      const response = await client.send(command);
      const objects: S3Object[] = [];

      // Add common prefixes (folders)
      if (response.CommonPrefixes) {
        for (const commonPrefix of response.CommonPrefixes) {
          if (commonPrefix.Prefix) {
            objects.push({
              key: commonPrefix.Prefix,
              size: 0,
              lastModified: new Date(), // Folders don't have modification dates
              isFolder: true,
            });
          }
        }
      }

      // Add actual objects (files)
      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Key !== prefix) {
            // Skip the prefix itself if it's an object
            objects.push({
              key: object.Key,
              size: object.Size || 0,
              lastModified: object.LastModified || new Date(),
              contentType: undefined, // ListObjectsV2 doesn't return content type
              isFolder: false,
              etag: object.ETag?.replace(/"/g, ""), // Remove quotes from ETag
            });
          }
        }
      }

      return objects;
    } catch (error) {
      throw new Error(`Failed to list objects in bucket ${bucket}: ${error}`);
    }
  }

  async uploadFile(profileId: string, bucket: string, filePath: string, s3Key: string): Promise<void> {
    const client = await this.getClientForBucket(profileId, bucket);

    try {
      // Read the file content
      const fileStream = createReadStream(filePath);

      // Get file stats for content type detection
      const fs = await import("fs");
      const path = await import("path");
      const stats = await fs.promises.stat(filePath);

      // Simple content type detection based on file extension
      const ext = path.extname(filePath).toLowerCase();
      const contentTypeMap: { [key: string]: string } = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".zip": "application/zip",
      };

      const contentType = contentTypeMap[ext] || "application/octet-stream";

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: contentType,
        ContentLength: stats.size,
      });

      await client.send(command);
    } catch (error) {
      throw new Error(`Failed to upload file ${filePath} to s3://${bucket}/${s3Key}: ${error}`);
    }
  }

  async downloadFile(profileId: string, bucket: string, s3Key: string, localPath: string): Promise<void> {
    const client = await this.getClientForBucket(profileId, bucket);

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      });

      const response: GetObjectCommandOutput = await client.send(command);

      if (!response.Body) {
        throw new Error("No data received from S3");
      }

      // Write the response body to local file
      const fs = await import("fs");
      const path = await import("path");

      // Ensure the directory exists
      const dir = path.dirname(localPath);
      await fs.promises.mkdir(dir, { recursive: true });

      // Convert the response body to a buffer and write to file
      const chunks: Uint8Array[] = [];

      if (response.Body instanceof ReadableStream) {
        const reader = response.Body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      }

      const buffer = Buffer.concat(chunks);
      await fs.promises.writeFile(localPath, buffer);
    } catch (error) {
      throw new Error(`Failed to download s3://${bucket}/${s3Key} to ${localPath}: ${error}`);
    }
  }

  async deleteObject(profileId: string, bucket: string, s3Key: string): Promise<void> {
    const client = await this.getClientForBucket(profileId, bucket);

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      });

      await client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete s3://${bucket}/${s3Key}: ${error}`);
    }
  }

  async generatePresignedUrl(
    profileId: string,
    bucket: string,
    s3Key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const client = await this.getClientForBucket(profileId, bucket);

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      });

      const signedUrl = await getSignedUrl(client, command, {
        expiresIn: expiresIn,
      });

      return signedUrl;
    } catch (error) {
      throw new Error(`Failed to generate presigned URL for s3://${bucket}/${s3Key}: ${error}`);
    }
  }
}
