// eslint-disable-next-line @typescript-eslint/no-var-requires
const { pathsToModuleNameMapper } = require("ts-jest");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { compilerOptions } = require("./tsconfig.json");

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // The `#/*` path alias is resolved via moduleNameMapper below; no baseUrl is set in
  // tsconfig, so we anchor the mapping at <rootDir> instead of passing `modulePaths`
  // (jest 30 rejects an undefined entry).
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/" }),
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // TypeScript 6 flags the project's implied `moduleResolution: node10` as deprecated;
        // acknowledge it here so the test type-check stays green without touching tsconfig.
        tsconfig: { ignoreDeprecations: "6.0" },
      },
    ],
  },
};
