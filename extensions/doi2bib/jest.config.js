module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/**/*.test.ts"],
  passWithNoTests: true,
  moduleNameMapper: {
    "^@raycast/api$": "<rootDir>/src/__mocks__/@raycast/api.ts",
  },
};
