export const Clipboard = {
  readText: jest.fn(),
  copy: jest.fn(),
  paste: jest.fn(),
};

export const showHUD = jest.fn();
export const showToast = jest.fn();

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
  },
};
