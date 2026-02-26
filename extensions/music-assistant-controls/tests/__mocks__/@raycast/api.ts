export const getPreferenceValues = jest.fn(() => ({
  host: "http://localhost:8095",
  token: "token-123",
  volumeStep: "10",
}));

export const showToast = jest.fn();
export const showHUD = jest.fn();
export const launchCommand = jest.fn();

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Loading: "loading",
  },
};

export const LocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};

export const LaunchType = {
  UserInitiated: "UserInitiated",
};
