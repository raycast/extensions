// Jest setup file
// This file runs after the test framework has been set up
// Jest globals are available automatically in the test environment

// Configure test timeout
// eslint-disable-next-line no-undef
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
