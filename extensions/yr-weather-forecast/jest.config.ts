import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  passWithNoTests: true,
  moduleNameMapper: {
    "^@raycast/api$": "<rootDir>/tests/__mocks__/@raycast/api.ts",
  },
};

export default config;
