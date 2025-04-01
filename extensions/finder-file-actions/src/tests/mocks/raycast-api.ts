import { jest } from "@jest/globals";

export const LocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

export const environment = {
  supportPath: "/tmp/raycast-test",
  extensionName: "finder-file-actions",
} as const;

export const showHUD = jest.fn();
export const showToast = jest.fn();
export const closeMainWindow = jest.fn();
export const popToRoot = jest.fn();

export const getPreferenceValues = jest.fn(() => ({
  maxResults: 100,
  maxRecentFolders: 10,
}));
