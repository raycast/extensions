import { getFrontmostApplication } from "@raycast/api";
import { runAppleScript, showFailureToast, usePromise } from "@raycast/utils";

interface Props {
  ignoreErrors?: boolean;
}

// implementation adapted from raindrop.io extension:
// https://github.com/raycast/extensions/blob/main/extensions/raindrop-io/src/hooks/useBrowserLink.ts
export const useBrowserLink = ({ ignoreErrors }: Props = {}) => {
  return usePromise(
    async () => {
      const app = await getFrontmostApplication();

      switch (app.bundleId) {
        case "company.thebrowser.Browser":
          return runAppleScript(`tell application "Arc" to return URL of active tab of front window`);
        case "com.vivaldi.Vivaldi":
          return runAppleScript(`tell application "Vivaldi" to return URL of active tab of front window`);
        case "com.google.Chrome":
          return runAppleScript(`tell application "Google Chrome" to return URL of active tab of front window`);
        case "com.brave.Browser":
          return runAppleScript(`tell application "Brave Browser" to return URL of active tab of front window`);
        case "com.apple.Safari":
          return runAppleScript(`tell application "Safari" to return URL of front document`);
        case "com.kagi.kagimacOS":
          return runAppleScript(`tell application "Orion" to return URL of front document`);
        case "org.mozilla.firefox":
          return runAppleScript(`
              tell application "System Events"
                tell application process "Firefox"
                  set frontWindow to front window
		  repeat with currentGroup in (groups of toolbar "Navigation" of group 1 of frontWindow)
		    try
		      repeat with currentComboBox in (combo boxes of currentGroup)
			try
			  set urlValue to value of text field 1 of currentComboBox
			  if urlValue contains "http" then return urlValue
		         end try
		      end repeat
		    end try
		  end repeat
	        end tell
              end tell `);
        default:
          break;
      }

      // Fallback for Vivaldi Browser not recognized by bundleId
      if (app?.name === "Vivaldi.app") {
        return runAppleScript(`tell application "Vivaldi" to return URL of active tab of front window`);
      }

      throw new Error(`Unsupported browser: ${app.name}`);
    },
    [],
    {
      onError: (error) => {
        if (!ignoreErrors) showFailureToast(error.message);
      },
    }
  );
};
