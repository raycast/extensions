module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['<rootDir>/test/**/*.(test|spec).[jt]s?(x)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  maxWorkers: 1,
  workerIdleMemoryLimit: "512MB",
  testTimeout: 10000,
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    '^@raycast/api$': '<rootDir>/test/mocks/@raycast/api.ts',
  },
}; 