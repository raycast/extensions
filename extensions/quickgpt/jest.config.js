module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  moduleNameMapper: {
    "^@raycast/api$": "<rootDir>/src/tests/mocks/raycast-api.ts",
  },
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
};
