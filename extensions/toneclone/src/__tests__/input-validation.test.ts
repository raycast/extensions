/**
 * Comprehensive tests for input validation in generate-text component
 * Tests validation for persona, prompt, and profile inputs
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  mockRaycastAPI,
  mockPersonas,
  mockProfiles,
  mockQueryResponse,
  mockPreferences,
  resetAllMocks,
  setupDefaultPreferences,
  setupLocalStorageMocks,
  createMockFetch,
} from "./test-utils";

// We need to mock the API module before importing the component
jest.mock("../api", () => ({
  api: {
    getPersonas: jest.fn(),
    getProfiles: jest.fn(),
    generateText: jest.fn(),
  },
}));

// Import after mocking
import { api } from "../api";

// Helper function to simulate form submission validation
// This extracts the validation logic from the generate-text component
async function validateFormInputs(values: { personaId?: string; prompt?: string; profileIds?: string[] }) {
  // Replicate the validation logic from generate-text.tsx
  if (!values.personaId || !values.prompt?.trim()) {
    throw new Error("Persona and prompt are required");
  }

  // Validate profiles array
  if (values.profileIds && !Array.isArray(values.profileIds)) {
    throw new Error("Profile IDs must be an array");
  }

  return true;
}

describe("Generate Text Input Validation", () => {
  const mockApiInstance = api as jest.Mocked<typeof api>;

  beforeEach(() => {
    resetAllMocks();
    setupDefaultPreferences();
    setupLocalStorageMocks();

    // Mock API methods
    mockApiInstance.getPersonas.mockResolvedValue(mockPersonas);
    mockApiInstance.getProfiles.mockResolvedValue(mockProfiles);
    mockApiInstance.generateText.mockResolvedValue(mockQueryResponse);
  });

  describe("Required Field Validation", () => {
    test("should reject empty persona ID", async () => {
      const values = {
        personaId: "",
        prompt: "Test prompt",
      };

      await expect(validateFormInputs(values)).rejects.toThrow("Persona and prompt are required");
    });

    test("should reject undefined persona ID", async () => {
      const values = {
        prompt: "Test prompt",
      };

      await expect(validateFormInputs(values)).rejects.toThrow("Persona and prompt are required");
    });

    test("should reject empty prompt", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "",
      };

      await expect(validateFormInputs(values)).rejects.toThrow("Persona and prompt are required");
    });

    test("should reject whitespace-only prompt", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "   ",
      };

      await expect(validateFormInputs(values)).rejects.toThrow("Persona and prompt are required");
    });

    test("should accept valid persona and prompt", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "Valid test prompt",
      };

      await expect(validateFormInputs(values)).resolves.toBe(true);
    });
  });

  describe("Profile Array Validation", () => {
    test("should accept valid profile array", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "Test prompt",
        profileIds: ["profile-1", "profile-2"],
      };

      await expect(validateFormInputs(values)).resolves.toBe(true);
    });

    test("should accept empty profile array", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "Test prompt",
        profileIds: [],
      };

      await expect(validateFormInputs(values)).resolves.toBe(true);
    });

    test("should accept undefined profile array", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "Test prompt",
      };

      await expect(validateFormInputs(values)).resolves.toBe(true);
    });

    test("should reject non-array profile IDs", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "Test prompt",
        profileIds: "not-an-array" as unknown as string[],
      };

      await expect(validateFormInputs(values)).rejects.toThrow("Profile IDs must be an array");
    });
  });

  describe("Combined Validation Scenarios", () => {
    test("should validate all fields together", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "Valid test prompt with sufficient content",
        profileIds: ["profile-1", "profile-2"],
      };

      await expect(validateFormInputs(values)).resolves.toBe(true);
    });

    test("should fail if persona is missing but other fields are valid", async () => {
      const values = {
        prompt: "Valid test prompt",
        profileIds: ["profile-1"],
      };

      await expect(validateFormInputs(values)).rejects.toThrow("Persona and prompt are required");
    });

    test("should fail if prompt is missing but other fields are valid", async () => {
      const values = {
        personaId: "persona-1",
        profileIds: ["profile-1"],
      };

      await expect(validateFormInputs(values)).rejects.toThrow("Persona and prompt are required");
    });

    test("should handle edge case with complex profile arrays", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "Test prompt",
        profileIds: ["profile-1", "profile-2", "profile-3", "profile-4"],
      };

      await expect(validateFormInputs(values)).resolves.toBe(true);
    });
  });

  describe("Boundary and Edge Cases", () => {
    test("should handle very long prompts", async () => {
      const longPrompt = "a".repeat(10000);
      const values = {
        personaId: "persona-1",
        prompt: longPrompt,
        profileIds: ["profile-1"],
      };

      await expect(validateFormInputs(values)).resolves.toBe(true);
    });

    test("should handle special characters in prompt", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "Test prompt with special chars: !@#$%^&*()[]{}|;':\",./<>?`~",
        profileIds: ["profile-1"],
      };

      await expect(validateFormInputs(values)).resolves.toBe(true);
    });

    test("should handle unicode characters in prompt", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "Test prompt with unicode: 🎉 こんにちは 🌟",
        profileIds: ["profile-1"],
      };

      await expect(validateFormInputs(values)).resolves.toBe(true);
    });

    test("should handle newlines and tabs in prompt", async () => {
      const values = {
        personaId: "persona-1",
        prompt: "Test prompt\nwith\nnewlines\tand\ttabs",
        profileIds: ["profile-1"],
      };

      await expect(validateFormInputs(values)).resolves.toBe(true);
    });
  });

  describe("Type Safety Validation", () => {
    test("should handle null values gracefully", async () => {
      const values = {
        personaId: null as unknown as string,
        prompt: "Test prompt",
      };

      await expect(validateFormInputs(values)).rejects.toThrow("Persona and prompt are required");
    });

    test("should handle numeric persona ID", async () => {
      const values = {
        personaId: 123 as unknown as string,
        prompt: "Test prompt",
      };

      // Our validation uses truthy check, so this should pass
      await expect(validateFormInputs(values)).resolves.toBe(true);
    });

    test("should handle boolean values", async () => {
      const values = {
        personaId: false as unknown as string,
        prompt: "Test prompt",
      };

      await expect(validateFormInputs(values)).rejects.toThrow("Persona and prompt are required");
    });
  });
});
