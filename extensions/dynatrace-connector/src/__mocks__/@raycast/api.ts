// src/__mocks__/@raycast/api.ts
// Minimal mock of @raycast/api for unit tests.

// Each Cache instance gets its own isolated store.
export const Cache = jest.fn().mockImplementation(() => {
  const store = new Map<string, string>();
  return {
    get: jest.fn((key: string) => store.get(key) ?? undefined),
    set: jest.fn((key: string, value: string) => store.set(key, value)),
    remove: jest.fn((key: string) => store.delete(key)),
    clear: jest.fn(() => store.clear()),
  };
});

export const getPreferenceValues = jest.fn(() => ({ useMockData: false }));
export const openExtensionPreferences = jest.fn();
export const showToast = jest.fn();
export const LocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

export const Toast = {
  Style: {
    Failure: "failure",
    Success: "success",
    Animated: "animated",
  },
};

export const Color = {
  Red: "raycast-color-red",
  Orange: "raycast-color-orange",
  Yellow: "raycast-color-yellow",
  Green: "raycast-color-green",
  Blue: "raycast-color-blue",
  SecondaryText: "raycast-color-secondary",
};

export const Icon = {
  XMarkCircle: "xmark-circle",
  Warning: "warning",
  Info: "info",
  Bug: "bug",
  Document: "document",
  ArrowClockwise: "arrow-clockwise",
  MagnifyingGlass: "magnifying-glass",
  Checkmark: "checkmark",
  Plus: "plus",
  Pencil: "pencil",
  Trash: "trash",
  Globe: "globe",
  Desktop: "desktop",
  Box: "box",
  Upload: "upload",
  LightBulb: "light-bulb",
};
