import { vi } from 'vitest';

export const showToast = vi.fn().mockResolvedValue({
  title: '',
  style: 'success',
});

export const Toast = {
  Style: {
    Success: 'success',
    Failure: 'failure',
    Animated: 'animated',
  },
};

export const getPreferenceValues = vi.fn(() => ({
  apiKey: 'test-api-key',
  useStream: true,
  isHistoryPaused: false,
  isAutoSaveConversation: true,
}));

export const clearSearchBar = vi.fn();

export const ActionPanel = vi.fn();
export const List = vi.fn();
export const Icon = vi.fn();
export const Detail = vi.fn();
export const Form = vi.fn();

export const useNavigation = vi.fn(() => ({
  push: vi.fn(),
  pop: vi.fn(),
}));

export const LocalStorage = {
  getItem: vi.fn().mockResolvedValue(null),
  setItem: vi.fn().mockResolvedValue(undefined),
  removeItem: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
};

export const Cache = vi.fn().mockImplementation(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
}));