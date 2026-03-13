import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // Only match .test.ts or .spec.ts files, not .tsx
  testMatch: [
    '**/__tests__/**/*.+(ts)',
    '**/?(*.)+(spec|test).+(ts)'
  ],
  transform: {
    '^.+\\.(ts)$': ['babel-jest', {}],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)'
  ],
  collectCoverage: true,
  // Only collect coverage from .ts files, not .tsx
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};

export default config;
