import { URL } from "url";
import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { Preferences } from "./types";

export const createBookmarkListItem = (url: string, name?: string) => {
  const urlOrigin = new URL(url).origin;
  const urlToDisplay = url.replace(/(^\w+:|^)\/\//, "");
  return {
    url: url,
    title: name ? name : urlToDisplay,
    subtitle: name ? urlToDisplay : undefined,
    iconURL: `${urlOrigin}/favicon.ico`,
  };
};

/**
 * Naive implementation. This can certainly be improved.
 */
export const matchSearchText = (searchText: string, url: string, name?: string) => {
  const searchWords = searchText
    .split(" ")
    .flatMap((e) => e.split("/"))
    .flatMap((e) => e.split("."))
    .filter((e) => e)
    .map(lowerCased);

  const nameWords =
    name
      ?.split(" ")
      .map(lowerCased)
      .filter((e) => e) ?? [];

  if (hasMatch(searchWords, nameWords)) {
    return true;
  }

  const urlWords = url
    .replace("https://", "")
    .replace("http://", "")
    .split("/")
    .flatMap((e) => e.split("."))
    .filter((e) => e)
    .map(lowerCased);

  if (hasMatch(searchWords, urlWords)) {
    return true;
  }

  return false;
};

const lowerCased = (text: string) => text.toLowerCase();

const hasMatch = (search: string[], words: string[]) => {
  for (const element of search) {
    for (const word of words) {
      if (word.includes(element)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Uses `URL` API.
 * @param urlString
 * @returns `true` if the `URL` constructor succeeds to create the URL. Note that `raycast.com` returns `false` because the protocol ("http" / "https") is missing).
 */
export const isValidUrl = (urlString: string) => {
  try {
    new URL(urlString);
    return true;
  } catch (err) {
    return false;
  }
};

export const formatAsUrl = (str: string) => {
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  } else {
    return `https://${str}`;
  }
};

/**
 * Run the script that opens Google Chrome.
 *
 * @param profileDirectory The directory of the profile to open
 * @param link The URL to open. If falsy, fallback on the value of `newBlankTabURL` in the preference.
 * @param willOpen Function to run before opening Google Chrome
 */
export const openGoogleChrome = async (profileDirectory: string, link: string, willOpen: () => Promise<void>) => {
  const script = `
    set theAppPath to quoted form of "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    set theProfile to quoted form of "${profileDirectory}"
    set theLink to quoted form of "${link || getPreferenceValues<Preferences>().newBlankTabURL}"
    do shell script theAppPath & " --profile-directory=" & theProfile & " " & theLink
  `;

  try {
    await willOpen();
    await runAppleScript(script);
  } catch (error) {
    // Handle errors silently
  }
};
