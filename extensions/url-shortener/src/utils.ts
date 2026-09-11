import { getPreferenceValues } from "@raycast/api";

export async function shorten(url: string) {
  const preferences = getPreferenceValues<Preferences>();

  const regexURL = /^((ftp|smtp|file|data):\/\/)?[^\s$.?#].[^\s]*$/;
  if (!regexURL.test(url)) throw new Error("Selected text isn't a URL.");
  if (preferences.domain === "4") {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(response.statusText);
    const result = await response.text();
    return result;
  } else {
    const response = await fetch(`https://v.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(response.statusText);
    const result = await response.text();
    if (result.includes("Error")) throw new Error(result);
    return result;
  }
}
