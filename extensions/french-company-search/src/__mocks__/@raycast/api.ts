/**
 * Mock for @raycast/api - Coherent with our testing strategy
 *
 * Testing Strategy:
 * 1. Local tests: Use Raycast preferences -> Real API calls
 * 2. GitHub Actions: Use mocked data -> No API calls
 * 3. Integration with shouldUseMock() logic
 */

import { getTestCredentials } from "../../__tests__/helpers/credentials";

export const environment = {
  isDevelopment: false,
  isProduction: true,
};

export const getPreferenceValues = jest.fn(() => {
  // Use our sophisticated credential detection system
  const credentials = getTestCredentials();

  // If no real credentials found, return empty values
  // This will cause shouldUseMock() to return true
  if (credentials.source === "none") {
    return {
      inpiUsername: "",
      inpiPassword: "",
    };
  }

  // Return real credentials (from env vars or Raycast preferences)
  return {
    inpiUsername: credentials.username,
    inpiPassword: credentials.password,
  };
});

// Mock other commonly used Raycast API functions for tests
export const showToast = jest.fn();
export const showFailureToast = jest.fn();
export const showSuccessToast = jest.fn();
export const popToRoot = jest.fn();
