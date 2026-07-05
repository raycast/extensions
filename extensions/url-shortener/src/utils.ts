import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";

export async function shorten(url: string) {
  const preferences = getPreferenceValues<Preferences>();

  const regexURL = /^((ftp|smtp|file|data):\/\/)?[^\s$.?#].[^\s]*$/;
  if (!regexURL.test(url)) throw new Error("Selected text isn't a URL.");
  let URLString = "";
  if (preferences.domain === "4") {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${url}`);
    if (!response.ok) throw new Error(response.statusText);
    const result = await response.text();
    URLString = result;
  } else {
    const response = await fetch(`https://v.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(response.statusText);
    const result = await response.text();
    if (result.includes("Error")) throw new Error(result);
    URLString = result;
  }

  if (preferences.clipboard == "1") {
    await Clipboard.paste(URLString);
    await showHUD("Pasted URL to Active Window");
  } else {
    await Clipboard.copy(URLString);
    await showHUD("Copied URL to Clipboard");
  }
}
