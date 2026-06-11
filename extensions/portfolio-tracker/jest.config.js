/**
 * Jest configuration for Portfolio Tracker tests.
 *
 * Uses ts-jest to run TypeScript tests directly without a separate compile step.
 * Module paths are configured to match the tsconfig paths.
 *
 * Note: Tests that import from @raycast/api will need mocks since
 * the Raycast runtime is not available in the test environment.
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  // Mock Raycast API modules since they're not available in test environment
  moduleNameMapper: {
    "^@raycast/api$": "<rootDir>/src/__tests__/__mocks__/raycast-api.ts",
    "^@raycast/utils$": "<rootDir>/src/__tests__/__mocks__/raycast-utils.ts",
  },
  // Increase timeout for integration tests that hit real APIs
  testTimeout: 30000,
  // Verbose output for clear test reporting
  verbose: true,
};
