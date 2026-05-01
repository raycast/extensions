/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/lib/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["src/lib/**/*.ts", "!src/lib/**/*.test.ts"],
  moduleNameMapper: {
    "^@raycast/(.*)$": "<rootDir>/src/test-stubs/raycast-$1.ts"
  }
};
