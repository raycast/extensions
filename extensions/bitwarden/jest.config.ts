import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: { "^~/(.*)$": "<rootDir>/src/$1" },
  moduleFileExtensions: ["ts", "tsx", "js"],
};

export default config;
