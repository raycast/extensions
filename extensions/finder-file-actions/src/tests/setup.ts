import { jest } from "@jest/globals";

// Mock run-applescript
jest.mock("run-applescript", () => ({
  runAppleScript: jest.fn(() => Promise.resolve("")),
}));
