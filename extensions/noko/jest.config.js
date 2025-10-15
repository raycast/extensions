module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.test.+(ts|tsx|js)",
    "**/*.(test|spec).+(ts|tsx|js)",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/__mocks__/",
    "/__tests__/setup.ts",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/timers.tsx", // Main entry point, not unit testable
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@raycast/api$": "<rootDir>/src/__tests__/__mocks__/@raycast/api.ts",
    "^@raycast/utils$": "<rootDir>/src/__tests__/__mocks__/@raycast/utils.ts",
  },
  // Transform ignore patterns for node_modules except specific packages
  transformIgnorePatterns: ["node_modules/(?!(@raycast|@raycast-utils)/)"],
};
