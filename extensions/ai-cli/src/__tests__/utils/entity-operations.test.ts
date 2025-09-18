import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEntityWithMetadata,
  createTimestamp,
  createVariantId,
  findEntityById,
  initializeBuiltInEntities,
  mergeWithBuiltInEntities,
  removeEntityFromList,
  updateEntityInList,
} from "@/utils/entity-operations";
import type { BaseCustomEntity, CustomEntityInput, CustomEntityUpdate } from "@/types";

// Test entity type for comprehensive testing
interface TestEntity extends BaseCustomEntity {
  name: string;
  description?: string;
  priority?: number;
}

describe("entity-operations", () => {
  describe("createVariantId", () => {
    it("should generate a unique variant ID", () => {
      const id = createVariantId();
      expect(typeof id).toBe("string");
      expect(id).toMatch(/^var-\d+-\d+$/);
    });

    it("should generate different IDs on subsequent calls", async () => {
      const id1 = createVariantId();
      await new Promise((resolve) => setTimeout(resolve, 1));
      const id2 = createVariantId();
      expect(id1).not.toBe(id2);
    });

    it("should include suffix when provided", () => {
      const suffix = "test-suffix";
      const id = createVariantId(suffix);
      expect(id).toMatch(new RegExp(`^var-\\d+-\\d+-${suffix}$`));
    });

    it("should handle special characters in suffix", () => {
      const specialSuffix = "test_suffix-123";
      const id = createVariantId(specialSuffix);
      expect(id).toMatch(new RegExp(`^var-\\d+-\\d+-${specialSuffix}$`));
    });

    it("should generate ID with timestamp and random components", () => {
      const mockTimestamp = 1234567890123;
      const mockRandom = 0.456;

      vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);
      vi.spyOn(Math, "random").mockReturnValue(mockRandom);

      const id = createVariantId();
      expect(id).toBe("var-1234567890123-456");

      vi.restoreAllMocks();
    });

    it("should handle empty string suffix", () => {
      const id = createVariantId("");
      expect(id).toMatch(/^var-\d+-\d+$/); // Empty string treated as no suffix
    });
  });

  describe("createTimestamp", () => {
    it("should generate a valid ISO timestamp", () => {
      const timestamp = createTimestamp();
      expect(typeof timestamp).toBe("string");
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it("should generate different timestamps on subsequent calls", async () => {
      const timestamp1 = createTimestamp();
      await new Promise((resolve) => setTimeout(resolve, 5));
      const timestamp2 = createTimestamp();
      expect(timestamp1).not.toBe(timestamp2);
    });

    it("should return valid ISO 8601 format", () => {
      const timestamp = createTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should create parseable date objects", () => {
      const timestamp = createTimestamp();
      const date = new Date(timestamp);
      expect(date.getTime()).toBeGreaterThan(0);
      expect(date.toISOString()).toBe(timestamp);
    });
  });

  describe("createEntityWithMetadata", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should create entity with required metadata", () => {
      const entityData: CustomEntityInput<TestEntity> = {
        name: "Test Entity",
        description: "Test description",
      };

      const entity = createEntityWithMetadata(entityData);

      expect(entity.name).toBe("Test Entity");
      expect(entity.description).toBe("Test description");
      expect(entity.id).toMatch(/^entity-\d+$/);
      expect(entity.isBuiltIn).toBe(false);
      expect(entity.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(entity.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(entity.createdAt).toBe(entity.updatedAt);
    });

    it("should use custom ID generator when provided", () => {
      const customIdGenerator = vi.fn(() => "custom-id-123");
      const entityData: CustomEntityInput<TestEntity> = {
        name: "Test Entity",
      };

      const entity = createEntityWithMetadata(entityData, customIdGenerator);

      expect(entity.id).toBe("custom-id-123");
      expect(customIdGenerator).toHaveBeenCalledOnce();
    });

    it("should preserve all provided entity data", () => {
      const entityData: CustomEntityInput<TestEntity> = {
        name: "Complex Entity",
        description: "Complex description",
        priority: 5,
      };

      const entity = createEntityWithMetadata(entityData);

      expect(entity.name).toBe("Complex Entity");
      expect(entity.description).toBe("Complex description");
      expect(entity.priority).toBe(5);
    });

    it("should handle minimal entity data", () => {
      const entityData: CustomEntityInput<TestEntity> = {
        name: "Minimal Entity",
      };

      const entity = createEntityWithMetadata(entityData);

      expect(entity.name).toBe("Minimal Entity");
      expect(entity.description).toBeUndefined();
      expect(entity.id).toBeDefined();
      expect(entity.isBuiltIn).toBe(false);
    });

    it("should generate consistent timestamps for same execution context", () => {
      const mockDate = new Date("2024-01-01T12:00:00.000Z");
      vi.spyOn(Date.prototype, "toISOString").mockReturnValue(mockDate.toISOString());

      const entity1 = createEntityWithMetadata({ name: "Entity 1" });
      const entity2 = createEntityWithMetadata({ name: "Entity 2" });

      expect(entity1.createdAt).toBe(entity2.createdAt);
      expect(entity1.updatedAt).toBe(entity2.updatedAt);

      vi.restoreAllMocks();
    });
  });

  describe("updateEntityInList", () => {
    const createTestEntities = (): TestEntity[] => [
      {
        id: "entity-1",
        name: "Entity 1",
        description: "First entity",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "entity-2",
        name: "Entity 2",
        description: "Second entity",
        priority: 1,
        isBuiltIn: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ];

    it("should update entity with matching ID", () => {
      const entities = createTestEntities();
      const updates: CustomEntityUpdate<TestEntity> = {
        name: "Updated Entity 1",
        description: "Updated description",
      };

      const result = updateEntityInList(entities, "entity-1", updates);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("entity-1");
      expect(result[0].name).toBe("Updated Entity 1");
      expect(result[0].description).toBe("Updated description");
      expect(result[0].updatedAt).not.toBe("2024-01-01T00:00:00.000Z");
      expect(result[1]).toEqual(entities[1]); // unchanged
    });

    it("should preserve other entity properties when updating", () => {
      const entities = createTestEntities();
      const updates: CustomEntityUpdate<TestEntity> = {
        description: "New description only",
      };

      const result = updateEntityInList(entities, "entity-2", updates);

      expect(result[1].id).toBe("entity-2");
      expect(result[1].name).toBe("Entity 2"); // preserved
      expect(result[1].description).toBe("New description only");
      expect(result[1].priority).toBe(1); // preserved
      expect(result[1].isBuiltIn).toBe(true); // preserved
      expect(result[1].createdAt).toBe("2024-01-01T00:00:00.000Z"); // preserved
    });

    it("should not modify list when ID not found", () => {
      const entities = createTestEntities();
      const updates: CustomEntityUpdate<TestEntity> = {
        name: "Non-existent update",
      };

      const result = updateEntityInList(entities, "non-existent-id", updates);

      expect(result).toEqual(entities);
      expect(result).not.toBe(entities); // new array
    });

    it("should handle empty entity list", () => {
      const result = updateEntityInList<TestEntity>([], "any-id", { name: "Test" });

      expect(result).toEqual([]);
    });

    it("should update with multiple properties", () => {
      const entities = createTestEntities();
      const updates: CustomEntityUpdate<TestEntity> = {
        name: "Multi Update",
        description: "Multi description",
        priority: 10,
      };

      const result = updateEntityInList(entities, "entity-1", updates);

      expect(result[0].name).toBe("Multi Update");
      expect(result[0].description).toBe("Multi description");
      expect(result[0].priority).toBe(10);
    });

    it("should always update the updatedAt timestamp", () => {
      const entities = createTestEntities();
      const originalUpdatedAt = entities[0].updatedAt;

      const result = updateEntityInList(entities, "entity-1", {});

      expect(result[0].updatedAt).not.toBe(originalUpdatedAt);
      expect(new Date(result[0].updatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });
  });

  describe("removeEntityFromList", () => {
    const createTestEntities = (): TestEntity[] => [
      {
        id: "entity-1",
        name: "Entity 1",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "entity-2",
        name: "Entity 2",
        isBuiltIn: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "entity-3",
        name: "Entity 3",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ];

    it("should remove entity with matching ID", () => {
      const entities = createTestEntities();

      const result = removeEntityFromList(entities, "entity-2");

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toEqual(["entity-1", "entity-3"]);
      expect(result.find((e) => e.id === "entity-2")).toBeUndefined();
    });

    it("should not modify list when ID not found", () => {
      const entities = createTestEntities();

      const result = removeEntityFromList(entities, "non-existent-id");

      expect(result).toHaveLength(3);
      expect(result).toEqual(entities);
      expect(result).not.toBe(entities); // new array
    });

    it("should handle empty entity list", () => {
      const result = removeEntityFromList([], "any-id");

      expect(result).toEqual([]);
    });

    it("should remove first entity", () => {
      const entities = createTestEntities();

      const result = removeEntityFromList(entities, "entity-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("entity-2");
      expect(result[1].id).toBe("entity-3");
    });

    it("should remove last entity", () => {
      const entities = createTestEntities();

      const result = removeEntityFromList(entities, "entity-3");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("entity-1");
      expect(result[1].id).toBe("entity-2");
    });

    it("should handle single entity removal", () => {
      const entities = [createTestEntities()[0]];

      const result = removeEntityFromList(entities, "entity-1");

      expect(result).toEqual([]);
    });
  });

  describe("findEntityById", () => {
    const createTestEntities = (): TestEntity[] => [
      {
        id: "entity-1",
        name: "Entity 1",
        description: "First entity",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "entity-2",
        name: "Entity 2",
        priority: 5,
        isBuiltIn: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ];

    it("should find entity with matching ID", () => {
      const entities = createTestEntities();

      const result = findEntityById(entities, "entity-1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("entity-1");
      expect(result?.name).toBe("Entity 1");
      expect(result?.description).toBe("First entity");
    });

    it("should return undefined when ID not found", () => {
      const entities = createTestEntities();

      const result = findEntityById(entities, "non-existent-id");

      expect(result).toBeUndefined();
    });

    it("should handle empty entity list", () => {
      const result = findEntityById([], "any-id");

      expect(result).toBeUndefined();
    });

    it("should find entity with complex properties", () => {
      const entities = createTestEntities();

      const result = findEntityById(entities, "entity-2");

      expect(result).toBeDefined();
      expect(result?.priority).toBe(5);
      expect(result?.isBuiltIn).toBe(true);
    });

    it("should return exact entity reference", () => {
      const entities = createTestEntities();
      const targetEntity = entities[0];

      const result = findEntityById(entities, "entity-1");

      expect(result).toBe(targetEntity);
    });
  });

  describe("mergeWithBuiltInEntities", () => {
    const createStoredEntities = (): TestEntity[] => [
      {
        id: "custom-1",
        name: "Custom Entity 1",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "builtin-1",
        name: "Custom Override of Built-in",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ];

    const createBuiltInEntities = (): TestEntity[] => [
      {
        id: "builtin-1",
        name: "Built-in Entity 1",
        isBuiltIn: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "builtin-2",
        name: "Built-in Entity 2",
        priority: 1,
        isBuiltIn: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ];

    it("should merge entities without duplicates", () => {
      const stored = createStoredEntities();
      const builtIn = createBuiltInEntities();

      const result = mergeWithBuiltInEntities(stored, builtIn);

      expect(result).toHaveLength(3);
      expect(result.map((e) => e.id)).toEqual(["custom-1", "builtin-1", "builtin-2"]);
    });

    it("should preserve stored entity when ID conflicts with built-in", () => {
      const stored = createStoredEntities();
      const builtIn = createBuiltInEntities();

      const result = mergeWithBuiltInEntities(stored, builtIn);

      const builtinEntity = result.find((e) => e.id === "builtin-1");
      expect(builtinEntity?.name).toBe("Custom Override of Built-in");
      expect(builtinEntity?.isBuiltIn).toBe(false);
    });

    it("should add unique built-in entities", () => {
      const stored = createStoredEntities();
      const builtIn = createBuiltInEntities();

      const result = mergeWithBuiltInEntities(stored, builtIn);

      const newBuiltinEntity = result.find((e) => e.id === "builtin-2");
      expect(newBuiltinEntity).toBeDefined();
      expect(newBuiltinEntity?.name).toBe("Built-in Entity 2");
      expect(newBuiltinEntity?.priority).toBe(1);
      expect(newBuiltinEntity?.isBuiltIn).toBe(true);
    });

    it("should handle null/undefined stored entities", () => {
      const builtIn = createBuiltInEntities();

      const result1 = mergeWithBuiltInEntities(null as any, builtIn);
      const result2 = mergeWithBuiltInEntities(undefined as any, builtIn);

      expect(result1).toEqual(builtIn);
      expect(result2).toEqual(builtIn);
    });

    it("should handle empty stored entities", () => {
      const builtIn = createBuiltInEntities();

      const result = mergeWithBuiltInEntities([], builtIn);

      expect(result).toEqual(builtIn);
    });

    it("should handle empty built-in entities", () => {
      const stored = createStoredEntities();

      const result = mergeWithBuiltInEntities(stored, []);

      expect(result).toEqual(stored);
    });

    it("should handle both empty arrays", () => {
      const result = mergeWithBuiltInEntities([], []);

      expect(result).toEqual([]);
    });

    it("should maintain order: stored first, then unique built-ins", () => {
      const stored: TestEntity[] = [
        {
          id: "stored-2",
          name: "Stored 2",
          isBuiltIn: false,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "stored-1",
          name: "Stored 1",
          isBuiltIn: false,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const builtIn: TestEntity[] = [
        {
          id: "builtin-1",
          name: "Built-in 1",
          isBuiltIn: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "stored-1", // duplicate
          name: "Built-in version of stored",
          isBuiltIn: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const result = mergeWithBuiltInEntities(stored, builtIn);

      expect(result.map((e) => e.id)).toEqual(["stored-2", "stored-1", "builtin-1"]);
    });
  });

  describe("initializeBuiltInEntities", () => {
    const createBuiltInEntities = (): TestEntity[] => [
      {
        id: "builtin-1",
        name: "Built-in Entity 1",
        isBuiltIn: true,
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      },
      {
        id: "builtin-2",
        name: "Built-in Entity 2",
        description: "Built-in description",
        priority: 5,
        isBuiltIn: true,
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      },
    ];

    it("should update timestamps for all entities", () => {
      const builtInEntities = createBuiltInEntities();

      const result = initializeBuiltInEntities(builtInEntities);

      expect(result).toHaveLength(2);
      result.forEach((entity) => {
        expect(entity.createdAt).not.toBe("2023-01-01T00:00:00.000Z");
        expect(entity.updatedAt).not.toBe("2023-01-01T00:00:00.000Z");
        expect(entity.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(entity.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    it("should preserve all other entity properties", () => {
      const builtInEntities = createBuiltInEntities();

      const result = initializeBuiltInEntities(builtInEntities);

      expect(result[0].id).toBe("builtin-1");
      expect(result[0].name).toBe("Built-in Entity 1");
      expect(result[0].isBuiltIn).toBe(true);

      expect(result[1].id).toBe("builtin-2");
      expect(result[1].name).toBe("Built-in Entity 2");
      expect(result[1].description).toBe("Built-in description");
      expect(result[1].priority).toBe(5);
      expect(result[1].isBuiltIn).toBe(true);
    });

    it("should set consistent timestamps for all entities in same call", () => {
      const builtInEntities = createBuiltInEntities();
      const mockDate = new Date("2024-01-01T12:00:00.000Z");
      vi.spyOn(Date.prototype, "toISOString").mockReturnValue(mockDate.toISOString());

      const result = initializeBuiltInEntities(builtInEntities);

      result.forEach((entity) => {
        expect(entity.createdAt).toBe("2024-01-01T12:00:00.000Z");
        expect(entity.updatedAt).toBe("2024-01-01T12:00:00.000Z");
      });

      vi.restoreAllMocks();
    });

    it("should handle empty array", () => {
      const result = initializeBuiltInEntities([]);

      expect(result).toEqual([]);
    });

    it("should not mutate original entities", () => {
      const builtInEntities = createBuiltInEntities();
      const originalTimestamp = builtInEntities[0].createdAt;

      const result = initializeBuiltInEntities(builtInEntities);

      expect(builtInEntities[0].createdAt).toBe(originalTimestamp);
      expect(result[0].createdAt).not.toBe(originalTimestamp);
      expect(result).not.toBe(builtInEntities);
    });

    it("should handle single entity", () => {
      const singleEntity = [createBuiltInEntities()[0]];

      const result = initializeBuiltInEntities(singleEntity);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("builtin-1");
      expect(result[0].createdAt).not.toBe("2023-01-01T00:00:00.000Z");
    });
  });

  describe("edge cases and error conditions", () => {
    it("should handle entities with undefined optional properties", () => {
      const entityData: CustomEntityInput<TestEntity> = {
        name: "Entity with undefined props",
        description: undefined,
        priority: undefined,
      };

      const entity = createEntityWithMetadata(entityData);

      expect(entity.name).toBe("Entity with undefined props");
      expect(entity.description).toBeUndefined();
      expect(entity.priority).toBeUndefined();
    });

    it("should handle very long entity names", () => {
      const longName = "A".repeat(1000);
      const entityData: CustomEntityInput<TestEntity> = {
        name: longName,
      };

      const entity = createEntityWithMetadata(entityData);

      expect(entity.name).toBe(longName);
      expect(entity.name).toHaveLength(1000);
    });

    it("should handle special characters in entity properties", () => {
      const entityData: CustomEntityInput<TestEntity> = {
        name: "Entity with émojis 🚀 and symbols @#$%",
        description: "Special chars: <>&\"'",
      };

      const entity = createEntityWithMetadata(entityData);

      expect(entity.name).toBe("Entity with émojis 🚀 and symbols @#$%");
      expect(entity.description).toBe("Special chars: <>&\"'");
    });

    it("should handle numeric edge cases in priority", () => {
      const entityData: CustomEntityInput<TestEntity> = {
        name: "Edge case entity",
        priority: 0,
      };

      const entity = createEntityWithMetadata(entityData);

      expect(entity.priority).toBe(0);
    });
  });
});
