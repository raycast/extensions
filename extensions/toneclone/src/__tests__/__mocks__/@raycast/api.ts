/**
 * Mock implementation of @raycast/api for testing
 */

export const getPreferenceValues = jest.fn();

export const LocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

export const showToast = jest.fn();

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

export const Clipboard = {
  copy: jest.fn(),
};

export const closeMainWindow = jest.fn();
export const popToRoot = jest.fn();

// Form components (for component testing if needed)
export const Form = {
  TextArea: jest.fn(),
  TextField: jest.fn(),
  Dropdown: jest.fn(),
  TagPicker: jest.fn(),
  FilePicker: jest.fn(),
  Separator: jest.fn(),
  Description: jest.fn(),
};

export const Action = {
  SubmitForm: jest.fn(),
};

export const ActionPanel = jest.fn();
export const Detail = jest.fn();
export const useNavigation = jest.fn(() => ({
  push: jest.fn(),
  pop: jest.fn(),
}));
