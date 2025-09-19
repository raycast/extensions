/**
 * Tests for types, constants, and type safety
 * Ensures all constants are properly defined and types are correct
 */

import {
  Persona,
  Profile,
  QueryRequest,
  QueryResponse,
  FileUploadResponse,
  TextUploadRequest,
  AssociateFilesRequest,
  APIError,
  SavedPreferences,
  FileSource,
  FILE_SOURCE_RAYCAST,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  DEFAULT_FORM_VALUES,
} from "../types";

describe("Type Definitions and Constants", () => {
  describe("Constants", () => {
    test("FILE_SOURCE_RAYCAST should be correctly defined", () => {
      expect(FILE_SOURCE_RAYCAST).toBe("raycast");
      expect(typeof FILE_SOURCE_RAYCAST).toBe("string");
    });

    test("MAX_FILE_SIZE should be 10MB in bytes", () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
      expect(typeof MAX_FILE_SIZE).toBe("number");
    });

    test("ALLOWED_FILE_TYPES should contain expected file extensions", () => {
      const expectedTypes = [".txt", ".doc", ".docx", ".pdf", ".md", ".rtf"];
      expect(ALLOWED_FILE_TYPES).toEqual(expectedTypes);
      expect(Array.isArray(ALLOWED_FILE_TYPES)).toBe(true);
      expect(ALLOWED_FILE_TYPES.length).toBe(6);
    });

    test("DEFAULT_FORM_VALUES should have correct default values", () => {
      expect(DEFAULT_FORM_VALUES.FORMALITY).toBe(5);
      expect(DEFAULT_FORM_VALUES.READING_LEVEL).toBe(10);
      expect(DEFAULT_FORM_VALUES.TARGET_LENGTH).toBe(200);

      // Ensure they are numbers
      expect(typeof DEFAULT_FORM_VALUES.FORMALITY).toBe("number");
      expect(typeof DEFAULT_FORM_VALUES.READING_LEVEL).toBe("number");
      expect(typeof DEFAULT_FORM_VALUES.TARGET_LENGTH).toBe("number");
    });

    test("default values should be within valid ranges", () => {
      expect(DEFAULT_FORM_VALUES.FORMALITY).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_FORM_VALUES.FORMALITY).toBeLessThanOrEqual(10);

      expect(DEFAULT_FORM_VALUES.READING_LEVEL).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_FORM_VALUES.READING_LEVEL).toBeLessThanOrEqual(16);

      expect(DEFAULT_FORM_VALUES.TARGET_LENGTH).toBeGreaterThan(0);
    });
  });

  describe("Type Interface Compatibility", () => {
    test("Persona interface should accept valid persona data", () => {
      const validPersona: Persona = {
        personaId: "persona-123",
        name: "Test Persona",
        lastUsedAt: "2024-01-01T00:00:00Z",
        lastModifiedAt: "2024-01-01T00:00:00Z",
        status: "active",
        trainingStatus: "completed",
        personaType: "custom",
        smartStyle: true,
      };

      expect(validPersona.personaId).toBe("persona-123");
      expect(validPersona.name).toBe("Test Persona");
      expect(typeof validPersona.smartStyle).toBe("boolean");
    });

    test("Profile interface should accept valid profile data", () => {
      const validProfile: Profile = {
        profileId: "profile-123",
        userId: "user-123",
        name: "Test Profile",
        instructions: "Test instructions",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      expect(validProfile.profileId).toBe("profile-123");
      expect(validProfile.userId).toBe("user-123");
      expect(validProfile.instructions).toBe("Test instructions");
    });

    test("QueryRequest interface should handle optional fields correctly", () => {
      // Minimal required fields
      const minimalRequest: QueryRequest = {
        personaId: "persona-123",
        prompt: "Test prompt",
      };

      expect(minimalRequest.personaId).toBe("persona-123");
      expect(minimalRequest.prompt).toBe("Test prompt");
      expect(minimalRequest.profileId).toBeUndefined();
      expect(minimalRequest.streaming).toBeUndefined();

      // Full request with all optional fields
      const fullRequest: QueryRequest = {
        personaId: "persona-123",
        prompt: "Test prompt",
        profileId: "profile-123",
        profileIds: ["profile-1", "profile-2"],
        context: "Test context",
        formality: 7,
        readingLevel: 12,
        length: 300,
        streaming: false,
      };

      expect(fullRequest.profileIds).toEqual(["profile-1", "profile-2"]);
      expect(fullRequest.formality).toBe(7);
      expect(fullRequest.readingLevel).toBe(12);
      expect(fullRequest.length).toBe(300);
      expect(fullRequest.streaming).toBe(false);
    });

    test("QueryResponse interface should match expected response format", () => {
      const validResponse: QueryResponse = {
        content: "Generated text content",
        personaId: "persona-123",
        prompt: "Original prompt",
        profileId: "profile-123",
      };

      expect(validResponse.content).toBe("Generated text content");
      expect(validResponse.personaId).toBe("persona-123");
      expect(validResponse.prompt).toBe("Original prompt");
      expect(validResponse.profileId).toBe("profile-123");
    });

    test("FileUploadResponse interface should handle file metadata", () => {
      const validResponse: FileUploadResponse = {
        fileId: "file-123",
        filename: "test-document.txt",
        fileType: "text/plain",
        size: 1024,
        createdAt: "2024-01-01T00:00:00Z",
        contentType: "text/plain",
        source: "raycast",
      };

      expect(validResponse.fileId).toBe("file-123");
      expect(validResponse.filename).toBe("test-document.txt");
      expect(validResponse.size).toBe(1024);
      expect(validResponse.source).toBe("raycast");
    });

    test("TextUploadRequest interface should require all fields", () => {
      const validRequest: TextUploadRequest = {
        content: "Text content to upload",
        filename: "test-file.txt",
        source: "raycast",
      };

      expect(validRequest.content).toBe("Text content to upload");
      expect(validRequest.filename).toBe("test-file.txt");
      expect(validRequest.source).toBe("raycast");
    });

    test("AssociateFilesRequest interface should handle file IDs array", () => {
      const validRequest: AssociateFilesRequest = {
        fileIds: ["file-1", "file-2", "file-3"],
      };

      expect(Array.isArray(validRequest.fileIds)).toBe(true);
      expect(validRequest.fileIds).toHaveLength(3);
      expect(validRequest.fileIds[0]).toBe("file-1");
    });

    test("APIError interface should handle error responses", () => {
      const errorWithBothFields: APIError = {
        error: "Primary error message",
        message: "Secondary message",
      };

      const errorWithOnlyError: APIError = {
        error: "Only error field",
      };

      expect(errorWithBothFields.error).toBe("Primary error message");
      expect(errorWithBothFields.message).toBe("Secondary message");
      expect(errorWithOnlyError.error).toBe("Only error field");
      expect(errorWithOnlyError.message).toBeUndefined();
    });

    test("SavedPreferences interface should handle dynamic keys", () => {
      const validPreferences: SavedPreferences = {
        lastPersonaId: "persona-123",
        lastProfileIds: ["profile-1", "profile-2"],
        lastInputType: "text",
        generatePersonaId: "gen-persona",
        trainPersonaId: "train-persona",
        customKey: "custom-value",
      };

      expect(validPreferences.lastPersonaId).toBe("persona-123");
      expect(validPreferences.lastProfileIds).toEqual(["profile-1", "profile-2"]);
      expect(validPreferences.lastInputType).toBe("text");
      expect(validPreferences.customKey).toBe("custom-value");
    });
  });

  describe("Type Safety and Validation", () => {
    test("FileSource type should only allow valid values", () => {
      const validSource: FileSource = "raycast";
      expect(validSource).toBe("raycast");

      // TypeScript would prevent this at compile time:
      // const invalidSource: FileSource = 'invalid'; // This would be a type error
    });

    test("SavedPreferences input types should be restricted", () => {
      const textType: SavedPreferences["lastInputType"] = "text";
      const fileType: SavedPreferences["lastInputType"] = "file";
      const undefinedType: SavedPreferences["lastInputType"] = undefined;

      expect(textType).toBe("text");
      expect(fileType).toBe("file");
      expect(undefinedType).toBeUndefined();
    });

    test("QueryRequest numeric fields should accept numbers", () => {
      const request: QueryRequest = {
        personaId: "test",
        prompt: "test",
        formality: 5.5, // Should accept decimals
        readingLevel: 10,
        length: 200,
      };

      expect(typeof request.formality).toBe("number");
      expect(typeof request.readingLevel).toBe("number");
      expect(typeof request.length).toBe("number");
    });
  });

  describe("Constant Relationships", () => {
    test("FILE_SOURCE_RAYCAST should match FileSource type", () => {
      const source: FileSource = FILE_SOURCE_RAYCAST;
      expect(source).toBe("raycast");
    });

    test("ALLOWED_FILE_TYPES should contain only string extensions", () => {
      ALLOWED_FILE_TYPES.forEach((type) => {
        expect(typeof type).toBe("string");
        expect(type.startsWith(".")).toBe(true);
        expect(type.length).toBeGreaterThan(1);
      });
    });

    test("DEFAULT_FORM_VALUES should match expected ranges", () => {
      // Formality should be between 1-10
      expect(DEFAULT_FORM_VALUES.FORMALITY).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_FORM_VALUES.FORMALITY).toBeLessThanOrEqual(10);

      // Reading level should be between 1-16
      expect(DEFAULT_FORM_VALUES.READING_LEVEL).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_FORM_VALUES.READING_LEVEL).toBeLessThanOrEqual(16);

      // Target length should be positive
      expect(DEFAULT_FORM_VALUES.TARGET_LENGTH).toBeGreaterThan(0);
    });
  });

  describe("Array and Object Types", () => {
    test("persona array should maintain type safety", () => {
      const personas: Persona[] = [
        {
          personaId: "persona-1",
          name: "First Persona",
          lastUsedAt: "2024-01-01T00:00:00Z",
          lastModifiedAt: "2024-01-01T00:00:00Z",
          status: "active",
          trainingStatus: "completed",
          personaType: "custom",
          smartStyle: true,
        },
        {
          personaId: "persona-2",
          name: "Second Persona",
          lastUsedAt: "2024-01-02T00:00:00Z",
          lastModifiedAt: "2024-01-02T00:00:00Z",
          status: "inactive",
          trainingStatus: "training",
          personaType: "preset",
          smartStyle: false,
        },
      ];

      expect(personas).toHaveLength(2);
      expect(personas[0].personaId).toBe("persona-1");
      expect(personas[1].smartStyle).toBe(false);
    });

    test("profile array should maintain type safety", () => {
      const profiles: Profile[] = [
        {
          profileId: "profile-1",
          userId: "user-1",
          name: "Email Profile",
          instructions: "Write professional emails",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      expect(profiles).toHaveLength(1);
      expect(profiles[0].instructions).toBe("Write professional emails");
    });
  });

  describe("Optional vs Required Fields", () => {
    test("should distinguish between required and optional fields in QueryRequest", () => {
      // This test mainly serves as documentation of the interface structure
      const baseRequest = {
        personaId: "required-field",
        prompt: "required-field",
      };

      const requestWithOptionals: QueryRequest = {
        ...baseRequest,
        profileId: "optional-field",
        profileIds: ["optional-array"],
        context: "optional-context",
        formality: 5,
        readingLevel: 10,
        length: 200,
        streaming: false,
      };

      // Required fields
      expect(requestWithOptionals.personaId).toBeDefined();
      expect(requestWithOptionals.prompt).toBeDefined();

      // Optional fields
      expect(requestWithOptionals.profileId).toBeDefined();
      expect(requestWithOptionals.context).toBeDefined();
      expect(requestWithOptionals.formality).toBeDefined();
    });

    test("should handle undefined optional fields gracefully", () => {
      const requestWithUndefined: QueryRequest = {
        personaId: "test",
        prompt: "test",
        profileId: undefined,
        context: undefined,
        formality: undefined,
        readingLevel: undefined,
        length: undefined,
        streaming: undefined,
      };

      expect(requestWithUndefined.profileId).toBeUndefined();
      expect(requestWithUndefined.context).toBeUndefined();
      expect(requestWithUndefined.formality).toBeUndefined();
    });
  });
});
