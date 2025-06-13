// Jest setup file for SonarQube Tools
import "@testing-library/jest-dom";

// Mock LocalStorage
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

// Silence console warnings/errors during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Raycast environment variables
process.env.NODE_ENV = "test";
