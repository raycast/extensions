import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock fetch for API tests
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
