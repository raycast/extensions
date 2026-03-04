import { vi } from "vitest";

export const useLocalStorage = vi.fn(() => ({
  value: undefined,
  setValue: vi.fn(),
  isLoading: false,
}));
