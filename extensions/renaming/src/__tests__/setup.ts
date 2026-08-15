/**
 * Global test setup for the renaming extension
 *
 * Mocks @raycast/api and @raycast/utils globally.
 * Provides shared test utilities and fixtures.
 */

import { vi, beforeEach } from "vitest";

// Mock Raycast modules globally
vi.mock("@raycast/api", () => import("./__mocks__/@raycast/api"));
vi.mock("@raycast/utils", () => import("./__mocks__/@raycast/utils"));

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
