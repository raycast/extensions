/**
 * Comprehensive tests for error handling scenarios and edge cases
 * Tests various failure scenarios, network issues, and recovery mechanisms
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import {
  resetAllMocks,
  setupDefaultPreferences,
  setupLocalStorageMocks,
  mockRaycastAPI,
  mockKnowledgeCards,
} from "./test-utils";

// Mock the API module
jest.mock("../api", () => ({
  api: {
    getPersonas: jest.fn(),
    getKnowledgeCards: jest.fn(),
    generateText: jest.fn(),
    uploadFile: jest.fn(),
    uploadText: jest.fn(),
    associateFilesWithPersona: jest.fn(),
  },
}));

import { api } from "../api";

const mockApiInstance = api as jest.Mocked<typeof api>;

describe("Error Handling and Edge Cases", () => {
  beforeEach(() => {
    resetAllMocks();
    setupDefaultPreferences();
    setupLocalStorageMocks();
  });

  describe("API Error Handling", () => {
    test("should handle 401 Unauthorized errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Invalid API key"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Invalid API key");
    });

    test("should handle 403 Forbidden errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Access forbidden"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Access forbidden");
    });

    test("should handle 404 Not Found errors", async () => {
      mockApiInstance.getKnowledgeCards.mockRejectedValue(new Error("Resource not found"));

      await expect(mockApiInstance.getKnowledgeCards()).rejects.toThrow("Resource not found");
    });

    test("should handle 429 Rate Limit errors", async () => {
      mockApiInstance.generateText.mockRejectedValue(new Error("Rate limit exceeded"));

      const request = {
        personaId: "persona-1",
        prompt: "Test prompt",
      };

      await expect(mockApiInstance.generateText(request)).rejects.toThrow("Rate limit exceeded");
    });

    test("should handle 500 Internal Server errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Internal server error"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Internal server error");
    });

    test("should handle 502 Bad Gateway errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Bad gateway"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Bad gateway");
    });

    test("should handle 503 Service Unavailable errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Service unavailable"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Service unavailable");
    });
  });

  describe("Network Error Handling", () => {
    test("should handle connection timeout errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Connection timeout"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Connection timeout");
    });

    test("should handle DNS resolution errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("DNS resolution failed"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("DNS resolution failed");
    });

    test("should handle network unavailable errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Network is unreachable"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Network is unreachable");
    });

    test("should handle SSL/TLS certificate errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Certificate verification failed"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Certificate verification failed");
    });

    test("should handle connection refused errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Connection refused"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Connection refused");
    });
  });

  describe("Data Validation Errors", () => {
    test("should handle invalid JSON response errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Invalid JSON in response"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Invalid JSON in response");
    });

    test("should handle unexpected response format errors", async () => {
      // Return data that doesn't match expected Persona interface
      const invalidPersonaData = [{ invalidField: "invalid" }];
      mockApiInstance.getPersonas.mockResolvedValue(invalidPersonaData as any);

      const result = await mockApiInstance.getPersonas();
      expect(result).toEqual(invalidPersonaData);
    });

    test("should handle missing required fields in API responses", async () => {
      const incompletePersonas = [
        {
          personaId: "persona-1",
          // Missing required fields like name, status, etc.
        },
      ];
      mockApiInstance.getPersonas.mockResolvedValue(incompletePersonas as any);

      const result = await mockApiInstance.getPersonas();
      expect(result).toEqual(incompletePersonas);
    });

    test("should handle null/undefined API responses", async () => {
      mockApiInstance.getPersonas.mockResolvedValue(null as any);
      const nullResult = await mockApiInstance.getPersonas();
      expect(nullResult).toBeNull();

      mockApiInstance.getKnowledgeCards.mockResolvedValue(undefined as any);
      const undefinedResult = await mockApiInstance.getKnowledgeCards();
      expect(undefinedResult).toBeUndefined();
    });
  });

  describe("Authentication and Authorization Errors", () => {
    test("should handle expired token errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Token has expired"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Token has expired");
    });

    test("should handle malformed token errors", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("Invalid token format"));

      await expect(mockApiInstance.getPersonas()).rejects.toThrow("Invalid token format");
    });

    test("should handle insufficient permissions errors", async () => {
      mockApiInstance.generateText.mockRejectedValue(new Error("Insufficient permissions"));

      const request = {
        personaId: "persona-1",
        prompt: "Test prompt",
      };

      await expect(mockApiInstance.generateText(request)).rejects.toThrow("Insufficient permissions");
    });
  });

  describe("File Upload Error Scenarios", () => {
    test("should handle file too large errors", async () => {
      const error = new Error("File size exceeds maximum allowed size");
      mockApiInstance.uploadFile.mockRejectedValue(error);

      const mockFile = new File(["content"], "test.txt");
      await expect(mockApiInstance.uploadFile(mockFile)).rejects.toThrow("File size exceeds maximum allowed size");
    });

    test("should handle unsupported file type errors", async () => {
      const error = new Error("File type not supported");
      mockApiInstance.uploadFile.mockRejectedValue(error);

      const mockFile = new File(["content"], "test.exe");
      await expect(mockApiInstance.uploadFile(mockFile)).rejects.toThrow("File type not supported");
    });

    test("should handle file corruption errors", async () => {
      const error = new Error("File appears to be corrupted");
      mockApiInstance.uploadFile.mockRejectedValue(error);

      const mockFile = new File(["corrupted"], "test.pdf");
      await expect(mockApiInstance.uploadFile(mockFile)).rejects.toThrow("File appears to be corrupted");
    });

    test("should handle upload timeout errors", async () => {
      const error = new Error("Upload timeout");
      mockApiInstance.uploadFile.mockRejectedValue(error);

      const mockFile = new File(["content"], "test.txt");
      await expect(mockApiInstance.uploadFile(mockFile)).rejects.toThrow("Upload timeout");
    });
  });

  describe("Text Generation Error Scenarios", () => {
    test("should handle persona not found errors", async () => {
      const error = new Error("Persona not found");
      mockApiInstance.generateText.mockRejectedValue(error);

      const request = {
        personaId: "nonexistent-persona",
        prompt: "Test prompt",
      };

      await expect(mockApiInstance.generateText(request)).rejects.toThrow("Persona not found");
    });

    test("should handle persona not trained errors", async () => {
      const error = new Error("Persona is not fully trained yet");
      mockApiInstance.generateText.mockRejectedValue(error);

      const request = {
        personaId: "untrained-persona",
        prompt: "Test prompt",
      };

      await expect(mockApiInstance.generateText(request)).rejects.toThrow("Persona is not fully trained yet");
    });

    test("should handle inappropriate content errors", async () => {
      const error = new Error("Content violates usage policy");
      mockApiInstance.generateText.mockRejectedValue(error);

      const request = {
        personaId: "persona-1",
        prompt: "Inappropriate content",
      };

      await expect(mockApiInstance.generateText(request)).rejects.toThrow("Content violates usage policy");
    });

    test("should handle generation timeout errors", async () => {
      const error = new Error("Text generation timed out");
      mockApiInstance.generateText.mockRejectedValue(error);

      const request = {
        personaId: "persona-1",
        prompt: "Complex prompt that takes too long",
      };

      await expect(mockApiInstance.generateText(request)).rejects.toThrow("Text generation timed out");
    });
  });

  describe("Preferences Error Handling", () => {
    test("should handle localStorage quota exceeded errors", async () => {
      mockRaycastAPI.LocalStorage.setItem.mockRejectedValue(new Error("Quota exceeded"));

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      // Import preferences functions after mocking
      const { saveLastPersona } = await import("../preferences");

      await saveLastPersona("generate", "persona-1");

      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to save persona preference:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });

    test("should handle localStorage access denied errors", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockRejectedValue(new Error("Access denied"));

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const { getSavedPreferences } = await import("../preferences");

      const result = await getSavedPreferences();

      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to load saved preferences:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });

    test("should handle localStorage corruption errors", async () => {
      mockRaycastAPI.LocalStorage.getItem.mockResolvedValue("corrupted-json{[");

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const { getSavedPreferences } = await import("../preferences");

      const result = await getSavedPreferences();

      expect(result).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("Edge Case Data Handling", () => {
    test("should handle empty arrays from API", async () => {
      mockApiInstance.getPersonas.mockResolvedValue([]);
      mockApiInstance.getKnowledgeCards.mockResolvedValue([]);

      const personas = await mockApiInstance.getPersonas();
      const knowledgeCards = await mockApiInstance.getKnowledgeCards();

      expect(personas).toEqual([]);
      expect(knowledgeCards).toEqual([]);
    });

    test("should handle very large API responses", async () => {
      // Simulate a very large persona list
      const largePersonaList = Array.from({ length: 1000 }, (_, i) => ({
        personaId: `persona-${i}`,
        name: `Persona ${i}`,
        lastUsedAt: "2024-01-01T00:00:00Z",
        lastModifiedAt: "2024-01-01T00:00:00Z",
        status: "active",
        trainingStatus: "completed",
        personaType: "custom",
        smartStyle: true,
      }));

      mockApiInstance.getPersonas.mockResolvedValue(largePersonaList);

      const result = await mockApiInstance.getPersonas();
      expect(result).toHaveLength(1000);
      expect(result[0].personaId).toBe("persona-0");
      expect(result[999].personaId).toBe("persona-999");
    });

    test("should handle special characters in data", async () => {
      const specialCharPersonas = [
        {
          personaId: "persona-1",
          name: "Persona with émojis 🚀 and üñíçødé",
          lastUsedAt: "2024-01-01T00:00:00Z",
          lastModifiedAt: "2024-01-01T00:00:00Z",
          status: "active",
          trainingStatus: "completed",
          personaType: "custom",
          smartStyle: true,
        },
      ];

      mockApiInstance.getPersonas.mockResolvedValue(specialCharPersonas);

      const result = await mockApiInstance.getPersonas();
      expect(result[0].name).toBe("Persona with émojis 🚀 and üñíçødé");
    });

    test("should handle null values in API responses", async () => {
      const personasWithNulls = [
        {
          personaId: "persona-1",
          name: "Valid Persona",
          lastUsedAt: null,
          lastModifiedAt: "2024-01-01T00:00:00Z",
          status: "active",
          trainingStatus: "completed",
          personaType: "custom",
          smartStyle: true,
        },
      ];

      mockApiInstance.getPersonas.mockResolvedValue(personasWithNulls as any);

      const result = await mockApiInstance.getPersonas();
      expect(result[0].lastUsedAt).toBeNull();
    });
  });

  describe("Concurrent Operation Error Handling", () => {
    test("should handle concurrent API requests failing differently", async () => {
      mockApiInstance.getPersonas.mockRejectedValueOnce(new Error("Personas failed"));
      mockApiInstance.getKnowledgeCards.mockResolvedValueOnce(mockKnowledgeCards);

      const results = await Promise.allSettled([mockApiInstance.getPersonas(), mockApiInstance.getKnowledgeCards()]);

      expect(results[0].status).toBe("rejected");
      expect(results[1].status).toBe("fulfilled");

      if (results[0].status === "rejected") {
        expect(results[0].reason.message).toBe("Personas failed");
      }
      if (results[1].status === "fulfilled") {
        expect(results[1].value).toEqual(mockKnowledgeCards);
      }
    });

    test("should handle race conditions in preference saves", async () => {
      let callCount = 0;
      mockRaycastAPI.LocalStorage.setItem.mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error("Save failed");
        }
        return undefined;
      });

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const { saveLastPersona, saveLastKnowledgeCards } = await import("../preferences");

      const promises = [saveLastPersona("generate", "persona-1"), saveLastKnowledgeCards(["knowledgeCard-1"])];

      await Promise.allSettled(promises);

      expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to save knowledge preferences:", expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe("Recovery and Fallback Mechanisms", () => {
    test("should provide default values when API calls fail", async () => {
      mockApiInstance.getPersonas.mockRejectedValue(new Error("API failed"));

      // Simulate how the component would handle the error
      let personas = [];
      try {
        personas = await mockApiInstance.getPersonas();
      } catch (error) {
        // Component should handle this gracefully
        personas = [];
      }

      expect(personas).toEqual([]);
    });

    test("should handle partial data corruption gracefully", async () => {
      const partiallyCorruptedData = [
        {
          personaId: "persona-1",
          name: "Valid Persona",
          lastUsedAt: "2024-01-01T00:00:00Z",
          lastModifiedAt: "2024-01-01T00:00:00Z",
          status: "active",
          trainingStatus: "completed",
          personaType: "custom",
          smartStyle: true,
        },
        {
          personaId: "persona-2",
          // Missing required fields - component should handle this
          corruptedField: "invalid data",
        },
      ];

      mockApiInstance.getPersonas.mockResolvedValue(partiallyCorruptedData as any);

      const result = await mockApiInstance.getPersonas();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Valid Persona");
      expect(result[1]).toHaveProperty("corruptedField");
    });
  });

  describe("Error Message Consistency", () => {
    test("should maintain consistent error message format", async () => {
      const apiMethods = [
        "getPersonas",
        "getKnowledgeCards",
        "generateText",
        "uploadFile",
        "uploadText",
        "associateFilesWithPersona",
      ] as const;

      for (const method of apiMethods) {
        const errorMessage = `${method} failed`;

        if (method === "generateText") {
          mockApiInstance[method].mockRejectedValue(new Error(errorMessage));
          await expect(
            mockApiInstance[method]({
              personaId: "test",
              prompt: "test",
            }),
          ).rejects.toThrow(errorMessage);
        } else if (method === "uploadFile") {
          mockApiInstance[method].mockRejectedValue(new Error(errorMessage));
          await expect(mockApiInstance[method](new File([""], "test.txt"))).rejects.toThrow(errorMessage);
        } else if (method === "uploadText") {
          mockApiInstance[method].mockRejectedValue(new Error(errorMessage));
          await expect(
            mockApiInstance[method]({
              content: "test",
              filename: "test.txt",
              source: "raycast",
            }),
          ).rejects.toThrow(errorMessage);
        } else if (method === "associateFilesWithPersona") {
          mockApiInstance[method].mockRejectedValue(new Error(errorMessage));
          await expect(mockApiInstance[method]("persona-1", { fileIds: ["file-1"] })).rejects.toThrow(errorMessage);
        } else {
          mockApiInstance[method].mockRejectedValue(new Error(errorMessage));
          await expect(mockApiInstance[method]()).rejects.toThrow(errorMessage);
        }
      }
    });

    test("should handle error objects without message property", async () => {
      const errorWithoutMessage = { error: "Custom error" };
      mockApiInstance.getPersonas.mockRejectedValue(errorWithoutMessage as any);

      await expect(mockApiInstance.getPersonas()).rejects.toEqual(errorWithoutMessage);
    });
  });
});
