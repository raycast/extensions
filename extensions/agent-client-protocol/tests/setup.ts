// Jest setup file for ACP extension tests
import { jest } from '@jest/globals';

// Mock Raycast API
jest.mock('@raycast/api', () => ({
  showToast: jest.fn(),
  showHUD: jest.fn(),
  LocalStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  Action: {
    OpenInBrowser: jest.fn(),
    CopyToClipboard: jest.fn(),
  },
  ActionPanel: jest.fn(),
  List: jest.fn(),
  Form: jest.fn(),
  Icon: {},
  Toast: {
    Style: {
      Success: 'success',
      Failure: 'failure',
    },
  },
}));

// Mock console for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};