export const getPreferenceValues = jest.fn(() => ({
  apiKey: "test-key",
  baseUrl: "http://localhost:8001",
}));
export const showHUD = jest.fn();
export const showToast = jest.fn();
export const Toast = {
  Style: {
    Failure: "failure" as const,
    Success: "success" as const,
    Animated: "animated" as const,
  },
};
