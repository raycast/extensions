// Test setup file

// Mock global fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Date.now for consistent testing
const mockDate = new Date("2024-01-01T12:00:00Z");
global.Date.now = jest.fn(() => mockDate.getTime());

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
