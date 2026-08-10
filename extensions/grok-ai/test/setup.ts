import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock say module
vi.mock('say', () => ({
  default: {
    stop: vi.fn(),
    speak: vi.fn(),
  },
}));

// Setup global fetch mock
global.fetch = vi.fn();

// Setup global AbortController
global.AbortController = class AbortController {
  signal = {
    aborted: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  abort = vi.fn(() => {
    this.signal.aborted = true;
  });
};