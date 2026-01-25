/**
 * Test setup file - mocks are loaded via vitest.config.ts aliases.
 * This file provides additional global setup.
 */

import { vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock global fetch for API tests
global.fetch = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
