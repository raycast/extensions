import { Cache } from "@raycast/api";
import { S3Object, S3Bucket, ConnectionProfile } from "../types";

interface CachedBucketListing {
  objects: S3Object[];
  timestamp: number;
}

interface CachedBuckets {
  buckets: S3Bucket[];
  timestamp: number;
}

interface CachedProfile {
  profile: ConnectionProfile;
  timestamp: number;
}

export class S3Cache {
  private static TTL = 5 * 60 * 1000; // 5 minutes
  private static PROFILE_TTL = 30 * 60 * 1000; // 30 minutes
  private cache = new Cache();

  async cacheBucketListing(profileId: string, bucket: string, objects: S3Object[]): Promise<void> {
    const key = `bucket_${profileId}_${bucket}`;
    const cacheData: CachedBucketListing = {
      objects,
      timestamp: Date.now(),
    };
    await this.cache.set(key, JSON.stringify(cacheData));
  }

  async getCachedBucketListing(profileId: string, bucket: string): Promise<S3Object[] | null> {
    const key = `bucket_${profileId}_${bucket}`;
    const cached = await this.cache.get(key);

    if (!cached) return null;

    try {
      const data: CachedBucketListing = JSON.parse(cached);
      if (Date.now() - data.timestamp > S3Cache.TTL) {
        await this.cache.remove(key);
        return null;
      }

      return data.objects;
    } catch {
      // Invalid cached data, remove it
      await this.cache.remove(key);
      return null;
    }
  }

  async cacheBuckets(profileId: string, buckets: S3Bucket[]): Promise<void> {
    const key = `buckets_${profileId}`;
    const cacheData: CachedBuckets = {
      buckets,
      timestamp: Date.now(),
    };
    await this.cache.set(key, JSON.stringify(cacheData));
  }

  async getCachedBuckets(profileId: string): Promise<S3Bucket[] | null> {
    const key = `buckets_${profileId}`;
    const cached = await this.cache.get(key);

    if (!cached) return null;

    try {
      const data: CachedBuckets = JSON.parse(cached);
      if (Date.now() - data.timestamp > S3Cache.TTL) {
        await this.cache.remove(key);
        return null;
      }

      return data.buckets;
    } catch {
      await this.cache.remove(key);
      return null;
    }
  }

  async clearCache(profileId?: string): Promise<void> {
    if (profileId) {
      // Clear cache for specific profile
      const keys = [`buckets_${profileId}`];
      // Note: We can't easily enumerate bucket-specific keys without additional tracking
      // In a real implementation, you might want to maintain an index of cache keys
      for (const key of keys) {
        await this.cache.remove(key);
      }
    } else {
      // Clear all cache - Note: Cache doesn't provide a clear all method
      // This would need to be implemented by tracking cache keys
      console.log("Clear all cache not implemented - Cache API limitation");
    }
  }

  async cacheProfile(profileId: string, profile: ConnectionProfile): Promise<void> {
    const key = `profile_${profileId}`;
    const cacheData: CachedProfile = {
      profile,
      timestamp: Date.now(),
    };
    await this.cache.set(key, JSON.stringify(cacheData));
  }

  async getCachedProfile(profileId: string): Promise<ConnectionProfile | null> {
    const key = `profile_${profileId}`;
    const cached = await this.cache.get(key);

    if (!cached) return null;

    try {
      const data: CachedProfile = JSON.parse(cached);
      // Profiles have longer TTL (30 minutes)
      if (Date.now() - data.timestamp > S3Cache.PROFILE_TTL) {
        await this.cache.remove(key);
        return null;
      }

      return data.profile;
    } catch {
      await this.cache.remove(key);
      return null;
    }
  }
}
