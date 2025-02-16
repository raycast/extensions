// __mocks__/raycast-api.ts
export const Icon = {
  Weights: "weights",
  ExclamationMark: "exclamation-mark",
  Person: "person",
  LightBulb: "light-bulb",
  Clock: "clock",
  CopyClipboard: "copy-clipboard",
};

export const Color = {
  Red: "#FF0000",
  Orange: "#FFA500",
  Yellow: "#FFFF00",
  Green: "#00FF00",
  Blue: "#0000FF",
  Purple: "#800080",
};

export const Toast = {
  Style: {
    Failure: "failure",
    Success: "success",
  },
};

export const showToast = jest.fn();
export const getPreferenceValues = jest.fn(() => ({
  unitSystem: "kg",
}));
export const Clipboard = {
  copy: jest.fn(),
};
