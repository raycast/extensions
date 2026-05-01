export const environment = {
  supportPath: "/tmp/test-support",
  assetsPath: "/tmp/test-assets",
};
export const showHUD = jest.fn();
export const showToast = jest.fn();
export const Toast = {
  Style: { Success: "SUCCESS", Failure: "FAILURE", Animated: "ANIMATED" },
};
export const confirmAlert = jest.fn();
export const Alert = {
  ActionStyle: {
    Default: "default",
    Cancel: "cancel",
    Destructive: "destructive",
  },
};
