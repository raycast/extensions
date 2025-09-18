import { describe, expect, it, vi } from "vitest";
import {
  createTempEntity,
  filterEntities,
  getEntityCountMessage,
  MinimalEntity,
  shouldShowEmptyView,
} from "@/utils/entity-list-helpers";

// Mock the validation helper
vi.mock("@/utils/validation", () => ({
  formatStringTemplate: vi.fn((template: string, placeholder: string, value: any) =>
    template.replace(`{${placeholder}}`, value.toString())
  ),
}));

interface TestEntity extends MinimalEntity {
  guidelines?: string;
  description?: string;
}

describe("entity-list-helpers", () => {
  describe("filterEntities", () => {
    const testEntities: TestEntity[] = [
      {
        id: "1",
        name: "Test Entity 1",
        guidelines: "Guidelines for entity 1",
        description: "Description of entity 1",
      },
      {
        id: "2",
        name: "Another Entity",
        guidelines: "Different guidelines",
        description: "Another description",
      },
      {
        id: "3",
        name: "Third Entity",
        guidelines: "Test guidelines",
      },
    ];

    it("should return all entities when search text is empty", () => {
      const result = filterEntities(testEntities, "", ["name"]);
      expect(result).toHaveLength(3);
    });

    it("should return all entities when search text is whitespace", () => {
      const result = filterEntities(testEntities, "   ", ["name"]);
      expect(result).toHaveLength(3);
    });

    it("should filter by single field", () => {
      const result = filterEntities(testEntities, "test", ["name"]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Entity 1");
    });

    it("should filter by multiple fields", () => {
      const result = filterEntities(testEntities, "test", ["name", "guidelines"]);
      expect(result).toHaveLength(2);
      expect(result.some((e) => e.name === "Test Entity 1")).toBe(true);
      expect(result.some((e) => e.name === "Third Entity")).toBe(true);
    });

    it("should be case insensitive", () => {
      const result = filterEntities(testEntities, "TEST", ["name"]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Entity 1");
    });

    it("should handle fields that don't exist", () => {
      const result = filterEntities(testEntities, "test", ["nonexistent" as keyof TestEntity]);
      expect(result).toHaveLength(0);
    });

    it("should handle undefined field values", () => {
      const result = filterEntities(testEntities, "description", ["description"]);
      expect(result).toHaveLength(2);
    });

    it("should trim search text", () => {
      const result = filterEntities(testEntities, "  test  ", ["name"]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Entity 1");
    });
  });

  describe("createTempEntity", () => {
    it("should create entity with defaults and timestamps", () => {
      const defaults = {
        id: "",
        name: "",
        guidelines: "",
        isBuiltIn: false,
      };

      const result = createTempEntity(defaults) as typeof defaults & {
        createdAt: string;
        updatedAt: string;
      };

      expect(result.id).toBe("");
      expect(result.name).toBe("");
      expect(result.guidelines).toBe("");
      expect(result.isBuiltIn).toBe(false);
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
      expect(typeof result.createdAt).toBe("string");
      expect(typeof result.updatedAt).toBe("string");
    });

    it("should preserve all properties from defaults", () => {
      const defaults = {
        id: "test-id",
        name: "Test Name",
        customProperty: "custom value",
        nestedObject: {
          prop: "value",
        },
      };

      const result = createTempEntity(defaults) as typeof defaults & {
        createdAt: string;
        updatedAt: string;
      };

      expect(result.id).toBe("test-id");
      expect(result.name).toBe("Test Name");
      expect(result.customProperty).toBe("custom value");
      expect(result.nestedObject.prop).toBe("value");
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
    });
  });

  describe("getEntityCountMessage", () => {
    it("should format count message correctly", () => {
      const result = getEntityCountMessage(5, "Templates");
      expect(result).toBe("Templates (5)");
    });

    it("should handle zero count", () => {
      const result = getEntityCountMessage(0, "Tones");
      expect(result).toBe("Tones (0)");
    });

    it("should handle different entity names", () => {
      const result = getEntityCountMessage(10, "CustomEntities");
      expect(result).toBe("CustomEntities (10)");
    });
  });

  describe("shouldShowEmptyView", () => {
    it("should return true when not loading and no entities", () => {
      expect(shouldShowEmptyView([], false)).toBe(true);
    });

    it("should return false when loading", () => {
      expect(shouldShowEmptyView([], true)).toBe(false);
    });

    it("should return false when has entities", () => {
      const entities = [{ id: "1", name: "Test" }];
      expect(shouldShowEmptyView(entities, false)).toBe(false);
    });

    it("should return false when loading even with entities", () => {
      const entities = [{ id: "1", name: "Test" }];
      expect(shouldShowEmptyView(entities, true)).toBe(false);
    });
  });
});
