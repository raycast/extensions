module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/__tests__/**",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        jsx: "react",
        esModuleInterop: true,
        skipLibCheck: true,
      },
    }],
  },
  moduleNameMapper: {
    "^@raycast/api$": "<rootDir>/src/__mocks__/@raycast/api.ts",
  },
};
