import { Clipboard, getSelectedText, Icon } from "@raycast/api";
import { RedirectionStep } from "./types";
import fetch from "node-fetch";

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

export async function getUrlFromSelectionOrClipboard(): Promise<string | undefined> {
  try {
    const selectedText = await getSelectedText();
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

  const clipboardText = await Clipboard.readText();
  if (clipboardText && isValidUrl(clipboardText)) {
    return clipboardText;
  }
}

export async function unshortenUrl(url: string): Promise<{ redirectionSteps: RedirectionStep[] }> {
  const redirectionSteps = [{ step: "Original", url: url }];

  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
    });

    while (response.url) {
      if (response.status === 301 || response.status === 302) {
        const nextUrl = response.headers.get("location");
        if (nextUrl) {
          redirectionSteps.push({ step: "Redirect", url: nextUrl });
          response = await fetch(nextUrl, { method: "HEAD", redirect: "manual" });
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
