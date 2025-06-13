module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js', '**/*.test.jsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  setupFilesAfterEnv: ['<rootDir>/src/testUtils/jest.setup.ts'],
  moduleNameMapper: {
    "^@raycast/api": "<rootDir>/node_modules/@raycast/api",
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/tests/**",
    "!**/node_modules/**"
  ]
};
