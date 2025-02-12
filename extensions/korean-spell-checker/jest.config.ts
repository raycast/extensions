import type { JestConfigWithTsJest } from "ts-jest"

const config: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@api/(.*)$": "<rootDir>/src/api/$1",
    "^@view/(.*)$": "<rootDir>/src/view/$1",
    "^@type/.*$": "<rootDir>/src/types.ts",
  },
}

export default config
