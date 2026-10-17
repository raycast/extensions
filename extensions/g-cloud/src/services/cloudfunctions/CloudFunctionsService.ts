/**
 * Cloud Functions Service
 *
 * Manages Cloud Functions v2 with caching and error handling.
 * Follows the same patterns as CloudBuildService and ComputeService.
 */

import {
  listCloudFunctions,
  getCloudFunction,
  deleteCloudFunction,
  invokeCloudFunction,
  CloudFunction,
} from "../../utils/gcpApi";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class CloudFunctionsService {
  private gcloudPath: string;
  private projectId: string;

  // Cache management
  private functionsCache: Map<string, CacheEntry<CloudFunction[]>> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
    if (!entry) return false;
    return Date.now() - entry.timestamp < this.CACHE_TTL;
  }

  /**
   * List all Cloud Functions, optionally filtered by region
   */
  async listFunctions(region?: string, useCache: boolean = true): Promise<CloudFunction[]> {
    const cacheKey = region ? `functions:${region}` : "functions:all";

    if (useCache) {
      const cached = this.functionsCache.get(cacheKey);
      if (this.isCacheValid(cached)) {
        return cached.data;
      }
    }

    const functions = await listCloudFunctions(this.gcloudPath, this.projectId, region);

    // Sort by update time (most recent first)
    functions.sort((a, b) => {
      const timeA = a.updateTime ? new Date(a.updateTime).getTime() : 0;
      const timeB = b.updateTime ? new Date(b.updateTime).getTime() : 0;
      return timeB - timeA;
    });

    this.functionsCache.set(cacheKey, {
      data: functions,
      timestamp: Date.now(),
    });

    return functions;
  }

  /**
   * Get a specific Cloud Function by name
   */
  async getFunction(location: string, functionName: string): Promise<CloudFunction | null> {
    try {
      return await getCloudFunction(this.gcloudPath, this.projectId, location, functionName);
    } catch (error) {
      console.error(`Error getting function ${functionName}:`, error);
      return null;
    }
  }

  /**
   * Delete a Cloud Function
   */
  async deleteFunction(location: string, functionName: string): Promise<void> {
    await deleteCloudFunction(this.gcloudPath, this.projectId, location, functionName);
    this.invalidateCache();
  }

  /**
   * Invoke an HTTP-triggered Cloud Function
   */
  async invokeFunction(
    functionUrl: string,
    data?: unknown,
  ): Promise<{ success: boolean; statusCode: number; body: string }> {
    try {
      const result = await invokeCloudFunction(this.gcloudPath, functionUrl, data);
      return {
        success: result.statusCode >= 200 && result.statusCode < 300,
        statusCode: result.statusCode,
        body: result.body,
      };
    } catch (error) {
      console.error("Error invoking function:", error);
      return {
        success: false,
        statusCode: 500,
        body: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Invalidate all caches (call after mutations)
   */
  invalidateCache(): void {
    this.functionsCache.clear();
  }

  /**
   * Extract function name and location from full resource name
   * Format: projects/{project}/locations/{location}/functions/{function}
   */
  static extractFunctionInfo(fullName: string): { location: string; functionName: string } {
    const parts = fullName.split("/");
    return {
      location: parts[3] || "unknown",
      functionName: parts[5] || fullName,
    };
  }

  /**
   * Get the trigger type for a function
   */
  static getTriggerType(fn: CloudFunction): "http" | "event" | "unknown" {
    if (fn.serviceConfig?.uri) {
      return "http";
    }
    if (fn.eventTrigger) {
      return "event";
    }
    return "unknown";
  }

  /**
   * Get a human-readable trigger description
   */
  static getTriggerDescription(fn: CloudFunction): string {
    if (fn.serviceConfig?.uri) {
      return "HTTP";
    }
    if (fn.eventTrigger?.eventType) {
      // Extract the event type name
      const eventType = fn.eventTrigger.eventType;
      if (eventType.includes("pubsub")) return "Pub/Sub";
      if (eventType.includes("storage")) return "Cloud Storage";
      if (eventType.includes("firestore")) return "Firestore";
      if (eventType.includes("firebase")) return "Firebase";
      if (eventType.includes("scheduler")) return "Cloud Scheduler";
      return eventType.split(".").pop() || "Event";
    }
    return "Unknown";
  }
}
