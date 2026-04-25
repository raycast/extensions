import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    // Mock @raycast/api for unit tests
    "^@raycast/api$": "<rootDir>/src/__mocks__/@raycast/api.ts",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  collectCoverageFrom: ["src/lib/utils/**/*.ts", "src/lib/api/**/*.ts"],
  coverageThreshold: {
    global: {
      lines: 90,
    },
  },
};

export default config;
