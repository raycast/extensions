import { Toast, getFrontmostApplication, showToast } from "@raycast/api";
import { runAppleScript, usePromise } from "@raycast/utils";

export function useBrowserLink() {
  return usePromise(
    async () => {
      const app = await getFrontmostApplication();

      switch (app.bundleId) {
        case "company.thebrowser.Browser":
          return runAppleScript(`tell application "Arc" to return URL of active tab of front window`);
        case "com.google.Chrome":
          return runAppleScript(`tell application "Google Chrome" to return URL of active tab of front window`);
        case "com.apple.Safari":
          return runAppleScript(`tell application "Safari" to return URL of front document`);
        default:
          throw new Error(`Unsupported App: ${app.name}`);
      }
    },
    [],
    {
      onError: (error) => {
        showToast(Toast.Style.Failure, error.message);
      },
    },
  );
}
