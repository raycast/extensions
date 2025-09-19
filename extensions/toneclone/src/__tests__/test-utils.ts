/**
 * Test utilities and mocks for Raycast ToneClone plugin tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Persona, KnowledgeCard, QueryResponse, FileUploadResponse } from "../types";

import * as RaycastAPI from "@raycast/api";

// Access the mocked Raycast API
export const mockRaycastAPI = RaycastAPI as jest.Mocked<typeof RaycastAPI>;

// Test data fixtures
export const mockPersonas: Persona[] = [
  {
    personaId: "persona-1",
    name: "Professional Writer",
    lastUsedAt: "2024-01-01T00:00:00Z",
    lastModifiedAt: "2024-01-01T00:00:00Z",
    status: "active",
    trainingStatus: "completed",
    personaType: "custom",
    smartStyle: true,
  },
  {
    personaId: "persona-2",
    name: "Casual Blogger",
    lastUsedAt: "2024-01-02T00:00:00Z",
    lastModifiedAt: "2024-01-02T00:00:00Z",
    status: "active",
    trainingStatus: "training",
    personaType: "custom",
    smartStyle: false,
  },
];

export const mockKnowledgeCards: KnowledgeCard[] = [
  {
    knowledgeCardId: "knowledgeCard-1",
    userId: "user-1",
    name: "Email Template",
    instructions: "Write professional emails",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    knowledgeCardId: "knowledgeCard-2",
    userId: "user-1",
    name: "Blog Post",
    instructions: "Write engaging blog posts",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

export const mockQueryResponse: QueryResponse = {
  content: "This is generated text content from ToneClone.",
  personaId: "persona-1",
  prompt: "Write a professional email",
  knowledgeCardId: "knowledgeCard-1",
};

export const mockFileUploadResponse: FileUploadResponse = {
  fileId: "file-123",
  filename: "test-document.txt",
  fileType: "text/plain",
  size: 1024,
  createdAt: "2024-01-01T00:00:00Z",
  contentType: "text/plain",
  source: "raycast",
};

// Helper functions for testing
export const createMockFetch = (responseData: any, status = 200, ok = true) => {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: jest.fn().mockResolvedValue(responseData),
  });
};

export const createMockFetchError = (error: Error) => {
  return jest.fn().mockRejectedValue(error);
};

export const createMockFileBuffer = (content: string) => {
  return Buffer.from(content, "utf8");
};

export const createMockFile = (content: string, filename: string, type = "text/plain") => {
  const buffer = createMockFileBuffer(content);
  return new File([buffer], filename, { type });
};

// Mock preferences data
export const mockPreferences = {
  apiKey: "tc_test_api_key_123",
  apiUrl: "https://api.toneclone.ai",
  rememberSelections: true,
};

// Mock saved preferences
export const mockSavedPreferences = {
  generatePersonaId: "persona-1",
  trainPersonaId: "persona-2",
  lastKnowledgeCardIds: ["knowledgeCard-1", "knowledgeCard-2"],
  lastInputType: "text" as const,
};

// Helper to reset all mocks
export const resetAllMocks = () => {
  Object.values(mockRaycastAPI).forEach((mock) => {
    if (typeof mock === "function") {
      mock.mockReset();
    } else if (typeof mock === "object") {
      Object.values(mock).forEach((nestedMock) => {
        if (typeof nestedMock === "function") {
          nestedMock.mockReset();
        }
      });
    }
  });

  if (global.fetch && typeof global.fetch === "function") {
    (global.fetch as jest.Mock).mockReset();
  }
};

// Helper to setup default preferences
export const setupDefaultPreferences = () => {
  mockRaycastAPI.getPreferenceValues.mockReturnValue(mockPreferences);
};

// Helper to setup local storage mocks
export const setupLocalStorageMocks = (savedData: any = mockSavedPreferences) => {
  mockRaycastAPI.LocalStorage.getItem.mockResolvedValue(JSON.stringify(savedData));
  mockRaycastAPI.LocalStorage.setItem.mockResolvedValue(undefined);
  mockRaycastAPI.LocalStorage.removeItem.mockResolvedValue(undefined);
};
