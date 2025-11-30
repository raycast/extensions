import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  listPrompts,
  getPrompt,
  createPrompt,
  updatePrompt,
  deletePrompt,
  clearAllPrompts,
  countPrompts,
  findPromptsByTag,
  searchPrompts,
} from "../promptStorage";
import { PromptManagerError } from "../../types/errors";
import { LocalStorage } from "@raycast/api";

// LocalStorage のモックストレージ
const mockStorage = new Map<string, string>();

describe("promptStorage integration tests", () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();

    // LocalStorage モックの動作を設定
    vi.mocked(LocalStorage.getItem).mockImplementation((key: string) =>
      Promise.resolve(mockStorage.get(key)),
    );

    vi.mocked(LocalStorage.setItem).mockImplementation(
      (key: string, value: string) => {
        mockStorage.set(key, value);
        return Promise.resolve();
      },
    );

    vi.mocked(LocalStorage.removeItem).mockImplementation((key: string) => {
      mockStorage.delete(key);
      return Promise.resolve();
    });
  });

  afterEach(async () => {
    await clearAllPrompts();
  });

  describe("createPrompt and listPrompts", () => {
    it("should create and retrieve a prompt", async () => {
      const input = {
        title: "Test Prompt",
        body: "Test Body",
        tags: ["test", "sample"],
      };

      const created = await createPrompt(input);

      expect(created.id).toBeDefined();
      expect(created.title).toBe(input.title);
      expect(created.body).toBe(input.body);
      expect(created.tags).toEqual(input.tags);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
      expect(created.createdAt).toBe(created.updatedAt);

      const prompts = await listPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toEqual(created);
    });

    it("should create prompt without tags", async () => {
      const input = {
        title: "Test",
        body: "Body",
      };

      const created = await createPrompt(input);

      expect(created.tags).toBeUndefined();
    });

    it("should throw error for empty title", async () => {
      const input = {
        title: "   ",
        body: "Body",
      };

      await expect(createPrompt(input)).rejects.toThrow(PromptManagerError);
      await expect(createPrompt(input)).rejects.toThrow("Title is required");
    });

    it("should throw error for empty body", async () => {
      const input = {
        title: "Title",
        body: "   ",
      };

      await expect(createPrompt(input)).rejects.toThrow(PromptManagerError);
      await expect(createPrompt(input)).rejects.toThrow("Body is required");
    });

    it("should trim title and body", async () => {
      const input = {
        title: "  Test Title  ",
        body: "  Test Body  ",
      };

      const created = await createPrompt(input);

      expect(created.title).toBe("Test Title");
      expect(created.body).toBe("Test Body");
    });
  });

  describe("listPrompts sorting", () => {
    it("should return prompts sorted by updatedAt descending", async () => {
      // Create three prompts with different timestamps
      const prompt1 = await createPrompt({ title: "First", body: "1" });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      const prompt2 = await createPrompt({ title: "Second", body: "2" });

      await new Promise((resolve) => setTimeout(resolve, 10));
      const prompt3 = await createPrompt({ title: "Third", body: "3" });

      const prompts = await listPrompts();

      expect(prompts).toHaveLength(3);
      // Most recent first
      expect(prompts[0].id).toBe(prompt3.id);
      expect(prompts[1].id).toBe(prompt2.id);
      expect(prompts[2].id).toBe(prompt1.id);
    });
  });

  describe("getPrompt", () => {
    it("should retrieve specific prompt by id", async () => {
      const created = await createPrompt({ title: "Test", body: "Body" });

      const retrieved = await getPrompt(created.id);

      expect(retrieved).toEqual(created);
    });

    it("should return undefined for non-existent id", async () => {
      const retrieved = await getPrompt("non-existent-id");

      expect(retrieved).toBeUndefined();
    });
  });

  describe("updatePrompt", () => {
    it("should update prompt title", async () => {
      const created = await createPrompt({ title: "Original", body: "Body" });

      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await updatePrompt(created.id, { title: "Updated" });

      expect(updated.title).toBe("Updated");
      expect(updated.body).toBe("Body");
      expect(updated.id).toBe(created.id);
      expect(updated.updatedAt).not.toBe(created.updatedAt);
      expect(updated.createdAt).toBe(created.createdAt);
    });

    it("should update prompt body", async () => {
      const created = await createPrompt({ title: "Title", body: "Original" });

      const updated = await updatePrompt(created.id, { body: "Updated" });

      expect(updated.body).toBe("Updated");
      expect(updated.title).toBe("Title");
    });

    it("should update tags", async () => {
      const created = await createPrompt({
        title: "Title",
        body: "Body",
        tags: ["old"],
      });

      const updated = await updatePrompt(created.id, { tags: ["new", "tags"] });

      expect(updated.tags).toEqual(["new", "tags"]);
    });

    it("should remove tags when updating with empty array", async () => {
      const created = await createPrompt({
        title: "Title",
        body: "Body",
        tags: ["tag"],
      });

      const updated = await updatePrompt(created.id, { tags: [] });

      expect(updated.tags).toBeUndefined();
    });

    it("should throw error for non-existent prompt", async () => {
      await expect(
        updatePrompt("non-existent", { title: "New" }),
      ).rejects.toThrow(PromptManagerError);
      await expect(
        updatePrompt("non-existent", { title: "New" }),
      ).rejects.toThrow("not found");
    });

    it("should throw error for empty title", async () => {
      const created = await createPrompt({ title: "Title", body: "Body" });

      await expect(updatePrompt(created.id, { title: "   " })).rejects.toThrow(
        "cannot be empty",
      );
    });

    it("should throw error for empty body", async () => {
      const created = await createPrompt({ title: "Title", body: "Body" });

      await expect(updatePrompt(created.id, { body: "   " })).rejects.toThrow(
        "cannot be empty",
      );
    });

    it("should trim updated values", async () => {
      const created = await createPrompt({ title: "Title", body: "Body" });

      const updated = await updatePrompt(created.id, {
        title: "  New Title  ",
        body: "  New Body  ",
      });

      expect(updated.title).toBe("New Title");
      expect(updated.body).toBe("New Body");
    });
  });

  describe("deletePrompt", () => {
    it("should delete existing prompt", async () => {
      const created = await createPrompt({ title: "To Delete", body: "Body" });

      await deletePrompt(created.id);

      const prompts = await listPrompts();
      expect(prompts).toHaveLength(0);

      const retrieved = await getPrompt(created.id);
      expect(retrieved).toBeUndefined();
    });

    it("should throw error for non-existent prompt", async () => {
      await expect(deletePrompt("non-existent")).rejects.toThrow(
        PromptManagerError,
      );
      await expect(deletePrompt("non-existent")).rejects.toThrow("not found");
    });

    it("should only delete specified prompt", async () => {
      const prompt1 = await createPrompt({ title: "Keep", body: "1" });
      const prompt2 = await createPrompt({ title: "Delete", body: "2" });

      await deletePrompt(prompt2.id);

      const prompts = await listPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0].id).toBe(prompt1.id);
    });
  });

  describe("countPrompts", () => {
    it("should return 0 for empty storage", async () => {
      const count = await countPrompts();
      expect(count).toBe(0);
    });

    it("should count prompts correctly", async () => {
      await createPrompt({ title: "1", body: "1" });
      await createPrompt({ title: "2", body: "2" });
      await createPrompt({ title: "3", body: "3" });

      const count = await countPrompts();
      expect(count).toBe(3);
    });
  });

  describe("findPromptsByTag", () => {
    beforeEach(async () => {
      await createPrompt({
        title: "Work Prompt",
        body: "1",
        tags: ["work", "important"],
      });
      await createPrompt({
        title: "Personal Prompt",
        body: "2",
        tags: ["personal"],
      });
      await createPrompt({
        title: "Mixed Prompt",
        body: "3",
        tags: ["work", "personal"],
      });
      await createPrompt({ title: "No Tags", body: "4" });
    });

    it("should find prompts by exact tag", async () => {
      const workPrompts = await findPromptsByTag("work");

      expect(workPrompts).toHaveLength(2);
      expect(workPrompts.map((p) => p.title)).toContain("Work Prompt");
      expect(workPrompts.map((p) => p.title)).toContain("Mixed Prompt");
    });

    it("should be case-insensitive", async () => {
      const workPrompts = await findPromptsByTag("WORK");

      expect(workPrompts).toHaveLength(2);
    });

    it("should return empty array for non-existent tag", async () => {
      const prompts = await findPromptsByTag("nonexistent");

      expect(prompts).toHaveLength(0);
    });
  });

  describe("searchPrompts", () => {
    beforeEach(async () => {
      await createPrompt({
        title: "Hello World",
        body: "Test content",
        tags: ["greeting"],
      });
      await createPrompt({
        title: "Goodbye",
        body: "Farewell message",
        tags: ["farewell"],
      });
      await createPrompt({
        title: "Test",
        body: "Hello from test",
        tags: ["test"],
      });
    });

    it("should search in title", async () => {
      const results = await searchPrompts("Hello");

      expect(results).toHaveLength(2);
      expect(results.map((p) => p.title)).toContain("Hello World");
      expect(results.map((p) => p.title)).toContain("Test");
    });

    it("should search in body", async () => {
      const results = await searchPrompts("message");

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Goodbye");
    });

    it("should search in tags", async () => {
      const results = await searchPrompts("greeting");

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Hello World");
    });

    it("should be case-insensitive", async () => {
      const results = await searchPrompts("HELLO");

      expect(results).toHaveLength(2);
    });

    it("should return empty array for no matches", async () => {
      const results = await searchPrompts("nonexistent");

      expect(results).toHaveLength(0);
    });
  });

  describe("clearAllPrompts", () => {
    it("should clear all prompts", async () => {
      await createPrompt({ title: "1", body: "1" });
      await createPrompt({ title: "2", body: "2" });

      await clearAllPrompts();

      const prompts = await listPrompts();
      expect(prompts).toHaveLength(0);
    });
  });

  describe("data corruption handling", () => {
    it("should handle corrupted JSON gracefully", async () => {
      // Directly set corrupted data
      mockStorage.set("prompts", "{ invalid json");

      await expect(listPrompts()).rejects.toThrow(PromptManagerError);
      await expect(listPrompts()).rejects.toThrow("Corrupted storage data");
    });

    it("should handle non-array data", async () => {
      // Set non-array data
      mockStorage.set("prompts", JSON.stringify({ not: "an array" }));

      await expect(listPrompts()).rejects.toThrow(PromptManagerError);
      await expect(listPrompts()).rejects.toThrow("Invalid data format");
    });

    it("should skip invalid prompts when loading", async () => {
      const validPrompt = await createPrompt({ title: "Valid", body: "Body" });

      // Manually corrupt the storage by adding invalid prompt
      const prompts = JSON.parse(mockStorage.get("prompts") || "[]");
      prompts.push({ invalid: "prompt", missing: "required fields" });
      mockStorage.set("prompts", JSON.stringify(prompts));

      const loaded = await listPrompts();

      // Should only have the valid prompt
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(validPrompt.id);
    });
  });
});
