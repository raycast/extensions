// Mock implementation of @raycast/api for testing

export const Clipboard = {
  readText: async (): Promise<string> => {
    return 'clipboard-test-content';
  },
  paste: async (): Promise<void> => {
    return undefined;
  },
  copy: async (): Promise<void> => {
    return undefined;
  },
};

export const Action = {};
export const ActionPanel = {};
export const Form = {};
export const useNavigation = () => ({
  pop: () => {},
  push: () => {},
});
export const Image = {};
export const Icon = {};
export const List = {};
export const showToast = () => {};
export const Toast = {};
export const confirmAlert = () => {};

