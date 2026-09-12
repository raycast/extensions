import { mock } from "node:test";

export const clipboardCopy = mock.fn(async () => undefined);
export const closeMainWindow = mock.fn(async () => undefined);
export const launchCommand = mock.fn(async () => undefined);
export const toastHide = mock.fn(async () => undefined);

export const Clipboard = {
  copy: clipboardCopy,
  paste: mock.fn(async () => undefined),
  read: mock.fn(async () => ({ text: "" })),
  readText: mock.fn(async () => ""),
};

export const LaunchType = { UserInitiated: "userInitiated" };
export const Toast = { Style: { Animated: "animated", Failure: "failure", Success: "success" } };
export const getPreferenceValues = () => ({
  closeRaycastAfterTranslation: false,
  key: "test-key:fx",
  onTranslateAction: "view",
  returnToRootState: false,
  source: "selected",
});
export const getSelectedText = mock.fn(async () => "");
export const popToRoot = mock.fn(async () => undefined);
export const showToast = mock.fn(async () => ({ hide: toastHide }));
