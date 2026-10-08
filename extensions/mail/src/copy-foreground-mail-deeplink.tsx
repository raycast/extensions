import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface GetMailDeeplinksResult {
  success: boolean;
  links: string[];
  message: string;
}

/**
 * Get deeplinks for selected emails in Mail application
 * @returns {Promise<GetMailDeeplinksResult>} Object containing success status, links array, and a status message
 */
export async function getMailDeeplinks(): Promise<GetMailDeeplinksResult> {
  const result = await runAppleScript(`
    tell application "System Events"
      set frontmostApp to name of application processes whose frontmost is true
    end tell

    if frontmostApp as string is equal to "Mail" then
      tell application "Mail"
        set _sel to get selection
        set _links to {}
        repeat with _msg in _sel
          set _messageURL to "message://%3c" & _msg's message id & "%3e"
          set end of _links to _messageURL
        end repeat

        set AppleScript's text item delimiters to return
        set _linksText to _links as string

        return _linksText
      end tell
    else
      return "ERROR: Foreground app was " & frontmostApp & ", not Mail"
    end if
  `);

  if (result.startsWith("ERROR:")) {
    return {
      success: false,
      links: [],
      message: result.replace("ERROR: ", ""),
    };
  } else {
    const links = result.split("\n").filter((link) => link.trim() !== "");
    return {
      success: true,
      links,
      message: "Successfully retrieved email deeplinks",
    };
  }
}

export default async function CopyForegroundMailDeeplink() {
  await closeMainWindow();
  await showToast(Toast.Style.Animated, "Getting Mail deeplink");

  const result = await getMailDeeplinks();

  if (result.success && result.links.length > 0) {
    await Clipboard.copy(result.links.join("\n"));
    await showToast(Toast.Style.Success, "Copied email deeplink to clipboard");
  } else {
    await showToast(Toast.Style.Failure, result.message);
  }
}
