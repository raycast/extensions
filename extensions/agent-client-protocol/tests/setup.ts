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

// Mock uuid
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => `test-uuid-${++uuidCounter}`),
}));

// Mock Raycast API LocalStorage
const mockStorage = new Map<string, string>();

// Use a unique test directory for each test run to avoid conflicts
const testRunId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const testSupportPath = `/tmp/raycast-acp-${testRunId}`;

jest.mock('@raycast/api', () => ({
  LocalStorage: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key))),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStorage.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockStorage.clear();
      return Promise.resolve();
    }),
    allItems: jest.fn(() => Promise.resolve(Object.fromEntries(mockStorage))),
  },
  environment: {
    supportPath: testSupportPath,
  },
  showToast: jest.fn(),
  showHUD: jest.fn(),
  Toast: {
    Style: {
      Success: 'success',
      Failure: 'failure',
      Animated: 'animated',
    },
  },
}));