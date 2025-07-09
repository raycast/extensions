export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const moduleFileExtensions = ['ts', 'tsx', 'js', 'jsx', 'json'];
export const transform = {
  '^.+\\.(ts|tsx)$': 'ts-jest',
};
export const transformIgnorePatterns = [
  'node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)',
];
export const testMatch = [
  '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
  '**/*.(test|spec).(ts|tsx|js)',
];
export const testPathIgnorePatterns = [
  '__tests__/test-helpers.ts',
  '__tests__/.*helpers.*',
];
export const moduleNameMapper = {
  '^@raycast/api$': '<rootDir>/__mocks__/@raycast/api.ts',
  '^node-fetch$': '<rootDir>/__mocks__/node-fetch.ts',
};
export const setupFilesAfterEnv = ['<rootDir>/jest.setup.js'];
export const collectCoverageFrom = [
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',
];
export const verbose = true;
