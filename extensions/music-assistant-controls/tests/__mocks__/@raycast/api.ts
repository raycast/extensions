export const getPreferenceValues = jest.fn(() => ({
  host: "http://localhost:8095",
}));

export const showToast = jest.fn();
export const showHUD = jest.fn();
export const launchCommand = jest.fn();

export const LocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};

export const LaunchType = {
  UserInitiated: "UserInitiated",
};
