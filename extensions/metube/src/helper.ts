import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface AddToQueueResponse {
  status: string;
  msg?: string;
}

export async function addToQueue(
  url: string,
  quality: string | null = null,
  format: string | null = null,
): Promise<AddToQueueResponse> {
  const preferences = getPreferenceValues<Preferences>();
  quality = quality ?? preferences.quality;
  format = format ?? preferences.format;

  const metubeUrl = `${preferences.metubeUrl}/add`;

  const body = JSON.stringify({ url, quality, format });
  const response = await fetch(metubeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });
  return response.json() as Promise<AddToQueueResponse>;
}

// original source: https://gist.github.com/dperini/729294
const re_weburl = new RegExp(
  "^" +
    "(?:(?:(?:https?|ftp):)?\\/\\/)?" +
    "(?:\\S+(?::\\S*)?@)?" +
    "(?:" +
    "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
    "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
    "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
    "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
    "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
    "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
    "|" +
    "(?:" +
    "(?:" +
    "[a-z0-9\\u00a1-\\uffff]" +
    "[a-z0-9\\u00a1-\\uffff_-]{0,62}" +
    ")?" +
    "[a-z0-9\\u00a1-\\uffff]\\." +
    ")+" +
    "(?:[a-z\\u00a1-\\uffff]{2,}\\.?)" +
    ")" +
    "(?::\\d{2,5})?" +
    "(?:[/?#]\\S*)?" +
    "$",
  "i",
);

export function isValidLink(testString: string) {
  return re_weburl.test(testString);
}

// export async function getHistory() {
//   const response = await fetch("http://localhost:8081/history");
//   return response.json();
// }
