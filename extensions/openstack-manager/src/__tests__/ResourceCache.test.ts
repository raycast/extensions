// Feature: openstack-manager, Property 12: Cache returns stored data within TTL

import * as fc from "fast-check";
import { LocalStorage } from "@raycast/api";
import { ResourceCache } from "../core/ResourceCache";

// Access the underlying Map for test cleanup
const mockStorage = (LocalStorage as unknown as { __storage: Map<string, string> }).__storage;

describe("ResourceCache - Property 12: Cache returns stored data within TTL", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  // **Validates: Requirements 10.1**
  it("set then immediate get returns the stored value for any key and JSON-serializable data", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), fc.jsonValue(), async (key: string, data: unknown) => {
        const cache = new ResourceCache();

        await cache.set(key, data);
        const result = await cache.get(key);

        expect(result).toEqual(data);

        // Clean up for next iteration
        mockStorage.clear();
      }),
      { numRuns: 100 },
    );
  });
});

describe("ResourceCache - Unit Tests", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  // Validates: Requirements 10.2
  describe("invalidate removes specific entry", () => {
    it("removes only the targeted key and leaves others intact", async () => {
      const cache = new ResourceCache();
      await cache.set("servers", [{ id: "1" }]);
      await cache.set("flavors", [{ id: "2" }]);

      await cache.invalidate("servers");

      expect(await cache.get("servers")).toBeNull();
      expect(await cache.get("flavors")).toEqual([{ id: "2" }]);
    });
  });

  // Validates: Requirements 10.2
  describe("clear removes all entries", () => {
    it("removes every cached entry", async () => {
      const cache = new ResourceCache();
      await cache.set("servers", [{ id: "1" }]);
      await cache.set("flavors", [{ id: "2" }]);
      await cache.set("images", [{ id: "3" }]);

      await cache.clear();

      expect(await cache.get("servers")).toBeNull();
      expect(await cache.get("flavors")).toBeNull();
      expect(await cache.get("images")).toBeNull();
    });
  });
});
