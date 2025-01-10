import { runAppleScript } from "@raycast/utils";

export const getBrowserURL = async (appName: string) => {
  console.log("appName", appName);

  try {
    const getBrowserURLScript = `
		tell application "${appName}" to activate
		tell application "System Events"
			keystroke "l" using command down
			keystroke "c" using command down
		end tell
		delay 0.5
		return the clipboard
`;

    return await runAppleScript(getBrowserURLScript);
  } catch (error) {
    return null;
  }
};

export const openURL = async ({ appName, url }: { appName: string; url: string }) => {
  await runAppleScript(`tell application "${appName}" to open location "${url}"`);
};
