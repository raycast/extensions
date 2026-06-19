module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@raycast/api$': '<rootDir>/src/__mocks__/@raycast_api.ts',
    '^@raycast/utils$': '<rootDir>/src/__mocks__/@raycast_utils.ts',
  },
};
