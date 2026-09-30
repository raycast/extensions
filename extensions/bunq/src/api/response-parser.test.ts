/**
 * Tests for response-parser utilities.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  parseResponseItems,
  parseResponseItem,
  parseIdResponse,
  parseIdResponseOrThrow,
  parseResponseItemsMultiKey,
} from "./response-parser";

// Mock schemas for testing
const TestItemSchema = z.object({
  TestItem: z
    .object({
      id: z.number(),
      name: z.string(),
    })
    .optional(),
});

const MultiKeySchema = z.object({
  TypeA: z
    .object({
      id: z.number(),
      typeAField: z.string(),
    })
    .optional(),
  TypeB: z
    .object({
      id: z.number(),
      typeBField: z.string(),
    })
    .optional(),
});

describe("response-parser", () => {
  describe("parseResponseItems", () => {
    it("parses a list of items from response", () => {
      const response = {
        Response: [
          { TestItem: { id: 1, name: "Item 1" } },
          { TestItem: { id: 2, name: "Item 2" } },
          { TestItem: { id: 3, name: "Item 3" } },
        ],
      };

      const items = parseResponseItems(response, TestItemSchema, "TestItem", "test response");

      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({ id: 1, name: "Item 1" });
      expect(items[1]).toEqual({ id: 2, name: "Item 2" });
      expect(items[2]).toEqual({ id: 3, name: "Item 3" });
    });

    it("returns empty array for empty response", () => {
      const response = { Response: [] };

      const items = parseResponseItems(response, TestItemSchema, "TestItem", "test response");

      expect(items).toHaveLength(0);
      expect(items).toEqual([]);
    });

    it("skips items that don't match schema", () => {
      const response = {
        Response: [
          { TestItem: { id: 1, name: "Valid" } },
          { OtherItem: { id: 2 } },
          { TestItem: { id: 3, name: "Also Valid" } },
        ],
      };

      const items = parseResponseItems(response, TestItemSchema, "TestItem", "test response");

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({ id: 1, name: "Valid" });
      expect(items[1]).toEqual({ id: 3, name: "Also Valid" });
    });

    it("skips items where key is null/undefined", () => {
      const response = {
        Response: [{ TestItem: { id: 1, name: "Valid" } }, { TestItem: null }, { TestItem: undefined }],
      };

      const items = parseResponseItems(response, TestItemSchema, "TestItem", "test response");

      expect(items).toHaveLength(1);
    });

    it("handles malformed response items", () => {
      const response = {
        Response: [
          { TestItem: { id: 1, name: "Valid" } },
          null,
          undefined,
          "string",
          123,
          { TestItem: { id: 2, name: "Also Valid" } },
        ],
      };

      const items = parseResponseItems(response, TestItemSchema, "TestItem", "test response");

      // Should still parse the valid items
      expect(items).toHaveLength(2);
    });
  });

  describe("parseResponseItem", () => {
    it("parses a single item from response", () => {
      const response = {
        Response: [{ TestItem: { id: 1, name: "Single Item" } }],
      };

      const item = parseResponseItem(response, TestItemSchema, "TestItem", "test response");

      expect(item).toEqual({ id: 1, name: "Single Item" });
    });

    it("returns first matching item when multiple exist", () => {
      const response = {
        Response: [{ TestItem: { id: 1, name: "First" } }, { TestItem: { id: 2, name: "Second" } }],
      };

      const item = parseResponseItem(response, TestItemSchema, "TestItem", "test response");

      expect(item).toEqual({ id: 1, name: "First" });
    });

    it("returns null for empty response", () => {
      const response = { Response: [] };

      const item = parseResponseItem(response, TestItemSchema, "TestItem", "test response");

      expect(item).toBeNull();
    });

    it("returns null when key not found", () => {
      const response = {
        Response: [{ OtherItem: { id: 1 } }],
      };

      const item = parseResponseItem(response, TestItemSchema, "TestItem", "test response");

      expect(item).toBeNull();
    });

    it("skips non-matching items and finds first match", () => {
      const response = {
        Response: [{ OtherItem: { id: 1 } }, { TestItem: { id: 2, name: "Found" } }],
      };

      const item = parseResponseItem(response, TestItemSchema, "TestItem", "test response");

      expect(item).toEqual({ id: 2, name: "Found" });
    });
  });

  describe("parseIdResponse", () => {
    it("extracts ID from response", () => {
      const response = {
        Response: [{ Id: { id: 123 } }],
      };

      const id = parseIdResponse(response, "test");

      expect(id).toBe(123);
    });

    it("returns null for empty response", () => {
      const response = { Response: [] };

      const id = parseIdResponse(response, "test");

      expect(id).toBeNull();
    });

    it("returns null when Id not found", () => {
      const response = {
        Response: [{ SomeOtherKey: { id: 123 } }],
      };

      const id = parseIdResponse(response, "test");

      expect(id).toBeNull();
    });

    it("finds ID among other response items", () => {
      const response = {
        Response: [{ SomeData: { field: "value" } }, { Id: { id: 456 } }],
      };

      const id = parseIdResponse(response, "test");

      expect(id).toBe(456);
    });

    it("handles zero as valid ID", () => {
      const response = {
        Response: [{ Id: { id: 0 } }],
      };

      const id = parseIdResponse(response, "test");

      expect(id).toBe(0);
    });
  });

  describe("parseIdResponseOrThrow", () => {
    it("returns ID when found", () => {
      const response = {
        Response: [{ Id: { id: 789 } }],
      };

      const id = parseIdResponseOrThrow(response, "payment");

      expect(id).toBe(789);
    });

    it("throws when ID not found", () => {
      const response = { Response: [] };

      expect(() => parseIdResponseOrThrow(response, "payment")).toThrow("No payment ID received");
    });

    it("throws with context in error message", () => {
      const response = { Response: [] };

      expect(() => parseIdResponseOrThrow(response, "customer statement")).toThrow("No customer statement ID received");
    });

    it("throws when response has items but no ID", () => {
      const response = {
        Response: [{ SomeData: { field: "value" } }],
      };

      expect(() => parseIdResponseOrThrow(response, "request")).toThrow("No request ID received");
    });
  });

  describe("parseResponseItemsMultiKey", () => {
    it("parses items with different wrapper keys", () => {
      const response = {
        Response: [
          { TypeA: { id: 1, typeAField: "A1" } },
          { TypeB: { id: 2, typeBField: "B1" } },
          { TypeA: { id: 3, typeAField: "A2" } },
        ],
      };

      const items = parseResponseItemsMultiKey(response, MultiKeySchema, ["TypeA", "TypeB"], "multi response");

      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({ item: { id: 1, typeAField: "A1" }, key: "TypeA" });
      expect(items[1]).toEqual({ item: { id: 2, typeBField: "B1" }, key: "TypeB" });
      expect(items[2]).toEqual({ item: { id: 3, typeAField: "A2" }, key: "TypeA" });
    });

    it("returns empty array for empty response", () => {
      const response = { Response: [] };

      const items = parseResponseItemsMultiKey(response, MultiKeySchema, ["TypeA", "TypeB"], "multi response");

      expect(items).toHaveLength(0);
    });

    it("skips items with unrecognized keys", () => {
      const response = {
        Response: [
          { TypeA: { id: 1, typeAField: "A1" } },
          { TypeC: { id: 2, typeCField: "C1" } },
          { TypeB: { id: 3, typeBField: "B1" } },
        ],
      };

      const items = parseResponseItemsMultiKey(response, MultiKeySchema, ["TypeA", "TypeB"], "multi response");

      expect(items).toHaveLength(2);
      expect(items[0]!.key).toBe("TypeA");
      expect(items[1]!.key).toBe("TypeB");
    });

    it("uses first matching key when item has multiple keys", () => {
      const response = {
        Response: [{ TypeA: { id: 1, typeAField: "A1" }, TypeB: { id: 1, typeBField: "B1" } }],
      };

      const items = parseResponseItemsMultiKey(response, MultiKeySchema, ["TypeA", "TypeB"], "multi response");

      expect(items).toHaveLength(1);
      expect(items[0]!.key).toBe("TypeA"); // TypeA comes first in keys array
    });

    it("respects key order preference", () => {
      const response = {
        Response: [{ TypeA: { id: 1, typeAField: "A1" }, TypeB: { id: 1, typeBField: "B1" } }],
      };

      // Same response, different key order
      const items = parseResponseItemsMultiKey(response, MultiKeySchema, ["TypeB", "TypeA"], "multi response");

      expect(items).toHaveLength(1);
      expect(items[0]!.key).toBe("TypeB"); // TypeB comes first now
    });

    it("handles null/undefined values in response", () => {
      const response = {
        Response: [
          { TypeA: { id: 1, typeAField: "A1" } },
          { TypeA: null },
          { TypeB: undefined },
          { TypeB: { id: 2, typeBField: "B1" } },
        ],
      };

      const items = parseResponseItemsMultiKey(response, MultiKeySchema, ["TypeA", "TypeB"], "multi response");

      expect(items).toHaveLength(2);
    });
  });
});
