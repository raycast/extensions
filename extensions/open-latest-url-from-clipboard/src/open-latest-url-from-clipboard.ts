import { showToast, Toast, Clipboard, open, closeMainWindow, getPreferenceValues } from "@raycast/api";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const prefs = getPreferenceValues<Preferences.OpenLatestUrlFromClipboard>();
    const allowedProtocols = [];

    if (prefs.allowHttp) allowedProtocols.push("http:");
    if (prefs.allowHttps) allowedProtocols.push("https:");
    if (prefs.allowFtp) allowedProtocols.push("ftp:");
    if (prefs.allowFile) allowedProtocols.push("file:");
    if (prefs.allowMailto) allowedProtocols.push("mailto:");
    if (prefs.allowTel) allowedProtocols.push("tel:");
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export default async function Main() {
  await closeMainWindow();

  for (let i = 0; i <= 5; i++) {
    const { text } = await Clipboard.read({ offset: i });
    const trimmedText = text?.trim();
    if (trimmedText && isValidUrl(trimmedText)) {
      await open(trimmedText);
      await showToast(Toast.Style.Success, "Opened URL from clipboard", trimmedText);
      return;
    }
  }
  await showToast(Toast.Style.Failure, "No URL found in the last 5 clipboard history items");
}
