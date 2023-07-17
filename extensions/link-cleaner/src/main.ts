import { Clipboard, showHUD } from "@raycast/api";
import { rules } from "./rules";

// detect all urls in text
function findURLs(text: string): string[] {
  const regex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(regex);
  return matches ? matches : [];
}

// replace all urls in text
function replaceURLs(text: string, newURLs: string[]): string {
  const urls = findURLs(text);
  for (const url of urls) {
    text = text.replace(url, newURLs.shift() || url);
  }
  return text;
}

// remove some query params from url
function removeQueryParams(url: string, allowParmas: string[]): string {
  // find all query params
  const urlParts = url.split("?");
  if (urlParts.length < 2) {
    return url;
  }
  const query = urlParts[1].split("&");

  // if params is not empty, match params to remove
  if (allowParmas.length > 0) {
    const newQuery = query.filter((param) => allowParmas.includes(param.split("=")[0]));
    return `${urlParts[0]}?${newQuery.join("&")}`;
  }
  // if params is empty, remove all query params
  return urlParts[0];
}

export default async function main() {
  // get raw text from clipboard
  const rawText = await Clipboard.readText();
  // if clipboard is empty, exit
  if (rawText === undefined) {
    await showHUD("Clipboard is empty");
    return;
  }

  // detect urls in text
  const urls = findURLs(rawText);
  // if no url found, exit
  if (urls.length === 0) {
    await showHUD("No URL found");
    return;
  }
  console.log("raw urls", urls);

  // generate new urls without tracking parameters
  const newURLs = [];
  for (const url of urls) {
    // convert shortened url to full url
    // url = await convertURL(url);
    // console.log("converted url", url);
    // find allow params in rules
    const allowParams = rules.find((rule) => url.includes(rule.url))?.allowParams || [];
    console.log("allow params", allowParams);
    // remove query params
    const newURL = removeQueryParams(url, allowParams);
    newURLs.push(newURL);
  }
  console.log("new urls", newURLs);

  // replace urls with new urls in text
  const newText = replaceURLs(rawText, newURLs);
  console.log("new text", newText);

  // finishing touches
  await Clipboard.copy(newText);
  await showHUD("Removed tracking parameters");
}
