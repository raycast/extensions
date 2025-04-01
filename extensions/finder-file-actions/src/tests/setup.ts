import { jest } from "@jest/globals";
import { mkdir } from "fs/promises";
import { environment } from "./mocks/raycast-api";

// Mock Raycast API
jest.mock("@raycast/api", () => {
  const api = jest.requireActual("./mocks/raycast-api");
  return api;
});

// Mock run-applescript
jest.mock("run-applescript", () => ({
  runAppleScript: jest.fn().mockResolvedValue(""),
}));

beforeAll(async () => {
  // Create test directories
  await mkdir(environment.supportPath, { recursive: true });
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Clean up after all tests
  jest.resetModules();
});
