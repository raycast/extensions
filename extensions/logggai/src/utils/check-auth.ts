import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";

export function checkAuth(): string | false {
  const { "Session Token": sessionToken } = getPreferenceValues();
  if (!sessionToken) {
    showToast({
      style: Toast.Style.Failure,
      title: "Not connected to Logggai",
      message:
        "Run `npx logggai login` in your terminal or sign in on logggai.run, then paste your session token in the extension preferences.",
      primaryAction: {
        title: "Open Logggai Dashboard",
        onAction: () => open("https://logggai.run"),
      },
    });
    return false;
  }
  return sessionToken;
}
