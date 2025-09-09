import { Clipboard, Color, getSelectedText, Icon } from "@raycast/api";
import { RedirectionStep } from "./types";
import fetch from "node-fetch";

export function ensureHttpPrefix(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url;
}

export function isValidUrl(url: string) {
  const regex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

  if (regex.test(url)) {
    try {
      new URL(url);
      return true;
    } catch {
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
      if (response.status >= 300 && response.status < 400) {
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

export const getTagColor = (statusCode: number) => {
  if (statusCode >= 200 && statusCode < 300) return Color.Green;
  if (statusCode >= 300 && statusCode < 400) return Color.Yellow;
  if (statusCode >= 400 && statusCode < 600) return Color.Red;
  return Color.PrimaryText;
};

export const getIcon = (statusCode: number) => {
  if (statusCode >= 100 && statusCode < 200) return Icon.Info;
  if (statusCode >= 200 && statusCode < 300) return Icon.CheckCircle;
  if (statusCode >= 300 && statusCode < 400) return Icon.ArrowClockwise;
  if (statusCode >= 400 && statusCode < 600) return Icon.XMarkCircle;
  return Icon.QuestionMark;
};
