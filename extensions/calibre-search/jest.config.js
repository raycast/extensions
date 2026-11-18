module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@raycast/api$": "<rootDir>/src/__mocks__/raycast-api.ts",
    "^@raycast/utils$": "<rootDir>/src/__mocks__/raycast-utils.ts",
  },
};
