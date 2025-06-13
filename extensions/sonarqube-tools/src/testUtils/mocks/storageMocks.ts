/**
 * Mocks for LocalStorage API and related functions
 */

import { Project } from "../../utils/projectManagement";

// Mock storage data
type StorageData = {
  [key: string]: string;
};

// In-memory storage for tests
const mockStorage: StorageData = {};

// Mock for LocalStorage.getItem
export const mockGetItem = jest.fn().mockImplementation(async (key: string): Promise<string | undefined> => {
  return mockStorage[key];
});

// Mock for LocalStorage.setItem
export const mockSetItem = jest.fn().mockImplementation(async (key: string, value: string): Promise<void> => {
  mockStorage[key] = value;
});

// Helper to pre-populate the mock storage with project data
export function setupMockProjects(projects: Project[]): void {
  mockStorage["sonarqubeProjectsList"] = JSON.stringify(projects);
}

// Helper to clear all mock storage data
export function clearMockStorage(): void {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
}
