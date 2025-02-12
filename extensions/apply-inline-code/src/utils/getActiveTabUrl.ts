import { showHUD } from '@raycast/api';
import { runAppleScript } from '@raycast/utils';

export async function getActiveTabUrl(browser: string) {
  const script =
    browser === 'Safari'
      ? `
    tell application "Safari"
      if it is running then
        get URL of front document
      end if
    end tell
  `
      : `
    tell application "${browser}"
      if it is running then
        get URL of active tab of front window
      end if
    end tell
  `;
  try {
    const url = await runAppleScript(script);

    if (!url) {
      return null;
    }

    return new URL(url);
  } catch (error) {
    showHUD('Get active tab URL failed.');
    return null;
  }
}
