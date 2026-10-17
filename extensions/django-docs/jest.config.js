/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          module: "commonjs",
          target: "ES2023",
          lib: ["ES2023", "DOM"],
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@raycast/api$": "<rootDir>/src/__mocks__/@raycast/api.tsx",
    "^@raycast/utils$": "<rootDir>/src/__mocks__/@raycast/utils.ts",
    "^cheerio$": "<rootDir>/src/__mocks__/cheerio.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/__mocks__/**",
    "!src/search-documentation.tsx",
    "!src/refresh-docs.tsx",
  ],
};
