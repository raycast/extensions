/**
 * Mock for @raycast/utils
 */

import { vi } from "vitest";

export const useCachedPromise = vi.fn(() => ({
  data: undefined,
  isLoading: true,
  error: undefined,
  revalidate: vi.fn(),
}));

export const useForm = vi.fn(() => ({
  handleSubmit: vi.fn(),
  itemProps: {},
  values: {},
  setValue: vi.fn(),
  reset: vi.fn(),
}));
