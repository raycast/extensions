import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

// Configure testing library
configure({ testIdAttribute: "data-testid" });

// Configure global test environment
(global as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Set up proper act() environment for concurrent React features
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("current testing environment is not configured to support act") ||
        args[0].includes("An update to") ||
        args[0].includes("You called act(async") ||
        args[0].includes("wrapped in act"))
    ) {
      return;
    }
    return originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Add a simple test to prevent Jest from complaining about empty test suite
test("setup file loads correctly", () => {
  expect(true).toBe(true);
});
