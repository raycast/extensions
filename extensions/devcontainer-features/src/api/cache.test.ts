import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionInfo, Feature, FeatureContent } from "../types";
import {
  clearCache,
  getCachedCollections,
  getCachedFeatureContent,
  getCachedFeatures,
  getCacheStats,
  getCacheTimestamp,
  getCacheTtlMs,
  setCachedCollections,
  setCachedFeatureContent,
  setCachedFeatures,
  setCacheTtl,
} from "./cache";

// Mock the @raycast/api Cache
vi.mock("@raycast/api", () => ({
  Cache: class MockCache {
    private store = new Map<string, string>();
    get(key: string): string | undefined {
      return this.store.get(key);
    }
    set(key: string, value: string): void {
      this.store.set(key, value);
    }
    remove(key: string): void {
      this.store.delete(key);
    }
    clear(): void {
      this.store.clear();
    }
  },
}));

const mockCollection: CollectionInfo = {
  sourceInformation: "devcontainers/features",
  ociReference: "ghcr.io/devcontainers/features",
};

const mockFeature: Feature = {
  id: "python",
  name: "Python",
  reference: "ghcr.io/devcontainers/features/python:1",
  description: "Installs Python",
  collection: mockCollection,
};

const mockContent: FeatureContent = {
  readme: "# Python Feature",
  scripts: [{ name: "install.sh", content: "#!/bin/bash\necho hello" }],
};

describe("setCacheTtl", () => {
  beforeEach(() => {
    setCacheTtl(24); // Reset to default
  });

  it("sets valid TTL", () => {
    setCacheTtl(12);
    expect(getCacheTtlMs()).toBe(12 * 60 * 60 * 1000);
  });

  it("rejects invalid TTL values", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    setCacheTtl(-1);
    expect(getCacheTtlMs()).toBe(24 * 60 * 60 * 1000);

    setCacheTtl(0);
    expect(getCacheTtlMs()).toBe(24 * 60 * 60 * 1000);

    setCacheTtl(NaN);
    expect(getCacheTtlMs()).toBe(24 * 60 * 60 * 1000);

    consoleSpy.mockRestore();
  });
});

describe("collections cache", () => {
  beforeEach(() => {
    clearCache();
    setCacheTtl(24);
  });

  it("returns null when cache is empty", () => {
    expect(getCachedCollections()).toBeNull();
  });

  it("stores and retrieves collections", () => {
    const collections = [mockCollection];
    setCachedCollections(collections);

    const cached = getCachedCollections();
    expect(cached).toEqual(collections);
  });

  it("validates collection structure", () => {
    const invalidCollection = { invalid: "data" };
    // @ts-expect-error Testing invalid data
    setCachedCollections([invalidCollection]);

    // Should return null because validation fails
    const cached = getCachedCollections();
    expect(cached).toBeNull();
  });

  it("filters out invalid collections", () => {
    const mixedCollections = [mockCollection, { invalid: "data" }];
    // @ts-expect-error Testing mixed data
    setCachedCollections(mixedCollections);

    const cached = getCachedCollections();
    expect(cached).toHaveLength(1);
    expect(cached?.[0]).toEqual(mockCollection);
  });
});

describe("features cache", () => {
  beforeEach(() => {
    clearCache();
    setCacheTtl(24);
  });

  it("returns null when cache is empty", () => {
    expect(getCachedFeatures()).toBeNull();
  });

  it("stores and retrieves features", () => {
    const features = [mockFeature];
    setCachedFeatures(features);

    const cached = getCachedFeatures();
    expect(cached).toEqual(features);
  });

  it("validates feature structure", () => {
    const invalidFeature = { id: "test" }; // Missing required fields
    // @ts-expect-error Testing invalid data
    setCachedFeatures([invalidFeature]);

    const cached = getCachedFeatures();
    expect(cached).toBeNull();
  });

  it("filters out invalid features", () => {
    const mixedFeatures = [mockFeature, { id: "incomplete" }];
    // @ts-expect-error Testing mixed data
    setCachedFeatures(mixedFeatures);

    const cached = getCachedFeatures();
    expect(cached).toHaveLength(1);
    expect(cached?.[0]).toEqual(mockFeature);
  });
});

describe("feature content cache", () => {
  beforeEach(() => {
    clearCache();
    setCacheTtl(24);
  });

  it("returns null when cache is empty", () => {
    expect(getCachedFeatureContent("test/key")).toBeNull();
  });

  it("stores and retrieves content", () => {
    setCachedFeatureContent("test/key", mockContent);

    const cached = getCachedFeatureContent("test/key");
    expect(cached).toEqual(mockContent);
  });

  it("returns null for empty key", () => {
    expect(getCachedFeatureContent("")).toBeNull();
  });

  it("validates content structure", () => {
    const invalidContent = { invalid: true };
    // @ts-expect-error Testing invalid data
    setCachedFeatureContent("test/key", invalidContent);

    const cached = getCachedFeatureContent("test/key");
    // Content with invalid structure should not be cached
    expect(cached).toBeNull();
  });
});

describe("clearCache", () => {
  beforeEach(() => {
    setCacheTtl(24);
  });

  it("clears all caches", () => {
    setCachedCollections([mockCollection]);
    setCachedFeatures([mockFeature]);
    setCachedFeatureContent("test/key", mockContent);

    clearCache();

    expect(getCachedCollections()).toBeNull();
    expect(getCachedFeatures()).toBeNull();
    expect(getCachedFeatureContent("test/key")).toBeNull();
  });
});

describe("getCacheTimestamp", () => {
  beforeEach(() => {
    clearCache();
    setCacheTtl(24);
  });

  it("returns null when no cache", () => {
    expect(getCacheTimestamp()).toBeNull();
  });

  it("returns timestamp after caching", () => {
    const before = Date.now();
    setCachedFeatures([mockFeature]);
    const after = Date.now();

    const timestamp = getCacheTimestamp();
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp!.getTime()).toBeGreaterThanOrEqual(before);
    expect(timestamp!.getTime()).toBeLessThanOrEqual(after);
  });
});

describe("getCacheStats", () => {
  beforeEach(() => {
    clearCache();
    setCacheTtl(24);
  });

  it("returns zero counts when empty", () => {
    const stats = getCacheStats();
    expect(stats.featuresCount).toBe(0);
    expect(stats.contentKeysCount).toBe(0);
    expect(stats.timestamp).toBeNull();
  });

  it("returns correct counts", () => {
    setCachedFeatures([mockFeature]);
    setCachedFeatureContent("key1", mockContent);
    setCachedFeatureContent("key2", mockContent);

    const stats = getCacheStats();
    expect(stats.featuresCount).toBe(1);
    expect(stats.contentKeysCount).toBe(2);
    expect(stats.timestamp).toBeInstanceOf(Date);
  });
});
