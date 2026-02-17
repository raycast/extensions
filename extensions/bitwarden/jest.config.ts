import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: { "^~/(.*)$": "<rootDir>/src/$1" },
  moduleFileExtensions: ["ts", "tsx", "js"],
  setupFilesAfterEnv: ["<rootDir>/src/utils/testing/setupEnvironment.tsx"],
  // Transform ESM-only packages (otplib, @otplib, @scure, @noble) so Jest can load them
  transformIgnorePatterns: [
    "node_modules/(?!(otplib|@otplib|@scure|@noble)/)",
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "node_modules/(otplib|@otplib|@scure|@noble)/.+\\.(js|mjs)$": "babel-jest",
  },
};

export default config;
