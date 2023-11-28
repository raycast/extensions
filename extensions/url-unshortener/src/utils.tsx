import { Clipboard, getSelectedText, Icon } from "@raycast/api";
import { RedirectionStep } from "./types";
import fetch from "node-fetch";

export function ensureHttpPrefix(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url;
}

export function isValidUrl(url: string) {
  const regex = /^(http:\/\/|https:\/\/)[\w-]+(\.[\w-]+)+/;

  if (regex.test(url)) {
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  }
  return false;
}

export async function getUrlFromSelectionOrClipboard(): Promise<string | undefined> {
  try {
    let selectedText = await getSelectedText();

    if (selectedText && isValidUrl(selectedText)) {
      return selectedText;
    }

    selectedText = ensureHttpPrefix(selectedText);
    if (selectedText && isValidUrl(selectedText)) {
      return selectedText;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unable to get selected text from frontmost application") {
      console.log("Failed to get text from selection. Trying clipboard instead.");
    } else {
      console.error(error);
    }
  }

  try {
    let clipboardText = await Clipboard.readText();
    if (clipboardText) {
      clipboardText = ensureHttpPrefix(clipboardText);
      if (isValidUrl(clipboardText)) {
        return clipboardText;
      }
    }
  } catch (error) {
    console.error(error);
  }
}

export async function unshortenUrl(url: string): Promise<{ redirectionSteps: RedirectionStep[] }> {
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
    });
    const redirectionSteps = [{ url: url, statusCode: response.status, statusName: response.statusText }];

    while (response.url) {
      if (response.status === 301 || response.status === 302) {
        const nextUrl = response.headers.get("location");
        if (nextUrl) {
          response = await fetch(nextUrl, { method: "HEAD", redirect: "manual" });
          redirectionSteps.push({
            url: nextUrl,
            statusCode: response.status,
            statusName: response.statusText,
          });
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return { redirectionSteps };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("An unknown error occurred");
    }
  }
}

export function getFaviconUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}`;
  } catch (error) {
    return Icon.Globe;
  }
}
