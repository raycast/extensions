// Jest setup file for ACP extension tests

// Set up test environment globals
process.env.NODE_ENV = 'test';

// Mock process.cwd for consistent testing
const originalCwd = process.cwd;
process.cwd = () => '/test/directory';

// Restore after tests if needed
afterAll(() => {
  process.cwd = originalCwd;
});

// Mock console for cleaner test output (only for tests)
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};