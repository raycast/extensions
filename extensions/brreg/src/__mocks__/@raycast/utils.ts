import { vi } from "vitest";

export const useLocalStorage = vi.fn(<T>(_key: string, initialValue?: T) => ({
  value: initialValue,
  setValue: vi.fn(),
  isLoading: false,
}));
export const getFavicon = vi.fn((url: string) => url);
