import { isIPv4 } from "net";
import { runAppleScript } from "@raycast/utils";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export function isUrl(text: string): boolean {
  const regex = /^(http|https|ftp):\/\/((?:[\w-]+\.)+[a-z\d]+)((?:\/[^/?#]*)+)?(\?[^#]+)?(#.+)?$/i;
  return regex.test(text) || isIPv4(text);
}

export const urlBuilder = (prefix: string, text: string) => {
  return /^https?:\/\//g.test(text) ? text : `${prefix}${encodeURIComponent(text)}`;
};

export const urlIPBuilder = (prefix: string, text: string) => {
  return /^http:\/\//g.test(text) ? text : `${prefix}${text}`;
};

const defaultBrowserSettingScript: string = ` 
tell application "System Settings"
\tactivate
\tdelay 0.5
\tset thePane to pane id "com.apple.Desktop-Settings.extension"
\tset theAnchor to anchor "Widgets" of thePane
\treveal theAnchor
\t
\tdelay 0.1
\tset thePane to pane id "com.apple.Desktop-Settings.extension"
\tset theAnchor to anchor "Widgets" of thePane
\treveal theAnchor
end tell
`;

export const openDefaultBrowserSetting = async () => {
  try {
    await runAppleScript(defaultBrowserSettingScript);
  } catch (e) {
    console.log(e);
  }
};
