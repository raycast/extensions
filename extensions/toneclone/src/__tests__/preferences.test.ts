/**
 * Comprehensive tests for preference management
 * Tests saving/loading preferences, type safety, and error handling
 */

import {
  getSavedPreferences,
  saveLastPersona,
  getLastPersona,
  saveLastKnowledgeCards,
  getLastKnowledgeCards,
  saveLastInputType,
  getLastInputType,
  clearPreferences,
} from "../preferences";
import { mockRaycastAPI, mockSavedPreferences, resetAllMocks, setupLocalStorageMocks } from "./test-utils";

describe("Preferences Management", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe("getSavedPreferences", () => {
    test("should return parsed preferences when localStorage has valid data", async () => {
      setupLocalStorageMocks(mockSavedPreferences);

      const result = await getSavedPreferences();

      expect(result).toEqual(mockSavedPreferences);
      expect(mockRaycastAPI.LocalStorage.getItem).toHaveBeenCalledWith("toneclone-preferences");
    });

    test("should return empty object when localStorage is empty", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockResolvedValue(undefined);

      const result = await getSavedPreferences();

      expect(result).toEqual({});
    });

    test("should return empty object when localStorage has null", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockResolvedValue(null);

      const result = await getSavedPreferences();

      expect(result).toEqual({});
    });

    test("should handle JSON parsing errors gracefully", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockResolvedValue("invalid-json");

      // Spy on console.warn to verify error logging
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await getSavedPreferences();

      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to load saved preferences:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });

    test("should handle localStorage errors gracefully", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await getSavedPreferences();

      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to load saved preferences:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe("saveLastPersona", () => {
    test("should save persona preference for specific command", async () => {
      setupLocalStorageMocks({});

      await saveLastPersona("generate", "persona-123");

      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledWith(
        "toneclone-preferences",
        JSON.stringify({ generatePersonaId: "persona-123" }),
      );
    });

    test("should merge with existing preferences", async () => {
      setupLocalStorageMocks({ trainPersonaId: "existing-persona" });

      await saveLastPersona("generate", "new-persona");

      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledWith(
        "toneclone-preferences",
        JSON.stringify({
          trainPersonaId: "existing-persona",
          generatePersonaId: "new-persona",
        }),
      );
    });

    test("should handle different command types", async () => {
      setupLocalStorageMocks({});

      await saveLastPersona("train", "train-persona");

      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledWith(
        "toneclone-preferences",
        JSON.stringify({ trainPersonaId: "train-persona" }),
      );
    });

    test("should handle save errors gracefully", async () => {
      setupLocalStorageMocks({});
      mockRaycastAPI.LocalStorage.setItem.mockRejectedValue(new Error("Save error"));

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      await saveLastPersona("generate", "persona-123");

      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to save persona preference:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });

    test("should handle getSavedPreferences errors during save", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockRejectedValue(new Error("Get error"));
      mockRaycastAPI.LocalStorage.setItem.mockResolvedValue(undefined);

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      await saveLastPersona("generate", "persona-123");

      // Should still attempt to save, even if get fails
      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledWith(
        "toneclone-preferences",
        JSON.stringify({ generatePersonaId: "persona-123" }),
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("getLastPersona", () => {
    test("should return persona ID for specific command", async () => {
      setupLocalStorageMocks({
        generatePersonaId: "generate-persona",
        trainPersonaId: "train-persona",
      });

      const result = await getLastPersona("generate");

      expect(result).toBe("generate-persona");
    });

    test("should return undefined when persona ID does not exist", async () => {
      setupLocalStorageMocks({});

      const result = await getLastPersona("generate");

      expect(result).toBeUndefined();
    });

    test("should return undefined when persona ID is not a string", async () => {
      setupLocalStorageMocks({
        generatePersonaId: 123, // Not a string
      });

      const result = await getLastPersona("generate");

      expect(result).toBeUndefined();
    });

    test("should handle errors gracefully", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockRejectedValue(new Error("Get error"));

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await getLastPersona("generate");

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to get last persona:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe("saveLastKnowledgeCards", () => {
    test("should save knowledge card IDs array", async () => {
      setupLocalStorageMocks({});

      await saveLastKnowledgeCards(["profile-1", "profile-2"]);

      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledWith(
        "toneclone-preferences",
        JSON.stringify({ lastKnowledgeCardIds: ["profile-1", "profile-2"] }),
      );
    });

    test("should save empty array", async () => {
      setupLocalStorageMocks({});

      await saveLastKnowledgeCards([]);

      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledWith(
        "toneclone-preferences",
        JSON.stringify({ lastKnowledgeCardIds: [] }),
      );
    });

    test("should merge with existing preferences", async () => {
      setupLocalStorageMocks({ generatePersonaId: "existing-persona" });

      await saveLastKnowledgeCards(["profile-1"]);

      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledWith(
        "toneclone-preferences",
        JSON.stringify({
          generatePersonaId: "existing-persona",
          lastKnowledgeCardIds: ["profile-1"],
        }),
      );
    });

    test("should handle save errors gracefully", async () => {
      setupLocalStorageMocks({});
      mockRaycastAPI.LocalStorage.setItem.mockRejectedValue(new Error("Save error"));

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      await saveLastKnowledgeCards(["profile-1"]);

      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to save knowledge preferences:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe("getLastKnowledgeCards", () => {
    test("should return profile IDs array", async () => {
      setupLocalStorageMocks({
        lastKnowledgeCardIds: ["profile-1", "profile-2"],
      });

      const result = await getLastKnowledgeCards();

      expect(result).toEqual(["profile-1", "profile-2"]);
    });

    test("should return empty array when not set", async () => {
      setupLocalStorageMocks({});

      const result = await getLastKnowledgeCards();

      expect(result).toEqual([]);
    });

    test("should return empty array when lastProfileIds is not an array", async () => {
      setupLocalStorageMocks({
        lastKnowledgeCardIds: "not-an-array",
      });

      const result = await getLastKnowledgeCards();

      expect(result).toEqual([]);
    });

    test("should handle errors gracefully", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockRejectedValue(new Error("Get error"));

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await getLastKnowledgeCards();

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to get last knowledge:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe("saveLastInputType", () => {
    test("should save text input type", async () => {
      setupLocalStorageMocks({});

      await saveLastInputType("text");

      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledWith(
        "toneclone-preferences",
        JSON.stringify({ lastInputType: "text" }),
      );
    });

    test("should save file input type", async () => {
      setupLocalStorageMocks({});

      await saveLastInputType("file");

      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledWith(
        "toneclone-preferences",
        JSON.stringify({ lastInputType: "file" }),
      );
    });

    test("should merge with existing preferences", async () => {
      setupLocalStorageMocks({ generatePersonaId: "existing-persona" });

      await saveLastInputType("text");

      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledWith(
        "toneclone-preferences",
        JSON.stringify({
          generatePersonaId: "existing-persona",
          lastInputType: "text",
        }),
      );
    });

    test("should handle save errors gracefully", async () => {
      setupLocalStorageMocks({});
      mockRaycastAPI.LocalStorage.setItem.mockRejectedValue(new Error("Save error"));

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      await saveLastInputType("text");

      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to save input type preference:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe("getLastInputType", () => {
    test("should return text input type", async () => {
      setupLocalStorageMocks({
        lastInputType: "text",
      });

      const result = await getLastInputType();

      expect(result).toBe("text");
    });

    test("should return file input type", async () => {
      setupLocalStorageMocks({
        lastInputType: "file",
      });

      const result = await getLastInputType();

      expect(result).toBe("file");
    });

    test("should return undefined when not set", async () => {
      setupLocalStorageMocks({});

      const result = await getLastInputType();

      expect(result).toBeUndefined();
    });

    test("should return undefined when invalid input type", async () => {
      setupLocalStorageMocks({
        lastInputType: "invalid",
      });

      const result = await getLastInputType();

      expect(result).toBeUndefined();
    });

    test("should handle errors gracefully", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockRejectedValue(new Error("Get error"));

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await getLastInputType();

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to get last input type:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe("clearPreferences", () => {
    test("should remove preferences from localStorage", async () => {
      mockRaycastAPI.LocalStorage.removeItem.mockResolvedValue(undefined);

      await clearPreferences();

      expect(mockRaycastAPI.LocalStorage.removeItem).toHaveBeenCalledWith("toneclone-preferences");
    });

    test("should handle removal errors gracefully", async () => {
      mockRaycastAPI.LocalStorage.removeItem.mockRejectedValue(new Error("Remove error"));

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      await clearPreferences();

      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to clear preferences:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe("Type Safety", () => {
    test("should handle mixed-type preferences correctly", async () => {
      const mixedPreferences = {
        generatePersonaId: "valid-string",
        trainPersonaId: 123, // Invalid type
        lastKnowledgeCardIds: ["valid", "array"],
        lastInputType: "text",
        invalidKey: "should-be-preserved",
      };

      setupLocalStorageMocks(mixedPreferences);

      // Test persona retrieval with type safety
      const generatePersona = await getLastPersona("generate");
      const trainPersona = await getLastPersona("train");

      expect(generatePersona).toBe("valid-string");
      expect(trainPersona).toBeUndefined(); // Should filter out non-string

      // Test profiles retrieval
      const profiles = await getLastKnowledgeCards();
      expect(profiles).toEqual(["valid", "array"]);

      // Test input type retrieval
      const inputType = await getLastInputType();
      expect(inputType).toBe("text");
    });

    test("should preserve unknown preference keys", async () => {
      setupLocalStorageMocks({ customKey: "custom-value" });

      await saveLastPersona("generate", "new-persona");

      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledWith(
        "toneclone-preferences",
        JSON.stringify({
          customKey: "custom-value",
          generatePersonaId: "new-persona",
        }),
      );
    });
  });

  describe("Edge Cases", () => {
    test("should handle localStorage returning empty string", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockResolvedValue("");

      const result = await getSavedPreferences();

      expect(result).toEqual({});
    });

    test("should handle localStorage returning non-object JSON", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockResolvedValue('"string-value"');

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await getSavedPreferences();

      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test("should handle localStorage returning array JSON", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockResolvedValue('["array", "value"]');

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await getSavedPreferences();

      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test("should handle concurrent saves without corruption", async () => {
      setupLocalStorageMocks({});

      // Simulate concurrent saves
      const promises = [
        saveLastPersona("generate", "persona-1"),
        saveLastKnowledgeCards(["profile-1"]),
        saveLastInputType("text"),
      ];

      await Promise.all(promises);

      // Should have been called for each save operation
      expect(mockRaycastAPI.LocalStorage.setItem).toHaveBeenCalledTimes(3);
    });
  });
});
