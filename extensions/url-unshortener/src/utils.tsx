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
    console.log("Starting URL expansion for:", url);

    const commonHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      Connection: "keep-alive",
    };

    // Try HEAD request first
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: commonHeaders,
    });

    // If HEAD fails or returns an error, retry with GET
    if (response.status >= 400 || !response.headers.get("location")) {
      console.log("HEAD request failed or no location header, retrying with GET");
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: commonHeaders,
      });
    }

    console.log("Initial response status:", response.status);
    console.log("Initial response headers:", Object.fromEntries(response.headers.entries()));

    const redirectionSteps = [{ url: url, statusCode: response.status, statusName: response.statusText }];
    let currentUrl = url;
    const maxRedirects = 10; // Safety limit
    let redirectCount = 0;

    while (redirectCount < maxRedirects) {
      if (response.status >= 300 && response.status < 400) {
        const nextUrl = response.headers.get("location");
        console.log("Found redirect to:", nextUrl);

        if (nextUrl) {
          // Handle relative URLs
          const resolvedUrl = new URL(nextUrl, currentUrl).toString();
          currentUrl = resolvedUrl;

          try {
            // Try HEAD request first for redirects too
            response = await fetch(resolvedUrl, {
              method: "HEAD",
              redirect: "manual",
              headers: commonHeaders,
            });

            // If HEAD fails or returns an error, retry with GET
            if (response.status >= 400 || !response.headers.get("location")) {
              console.log("HEAD request failed for redirect, retrying with GET");
              response = await fetch(resolvedUrl, {
                method: "GET",
                redirect: "manual",
                headers: commonHeaders,
              });
            }

            console.log("Redirect response status:", response.status);
            console.log("Redirect response headers:", Object.fromEntries(response.headers.entries()));

            redirectionSteps.push({
              url: resolvedUrl,
              statusCode: response.status,
              statusName: response.statusText,
            });
            redirectCount++;
          } catch (redirectError) {
            console.error("Error following redirect:", redirectError);
            // Don't throw, just break the chain and return what we have
            break;
          }
        } else {
          console.log("No location header found in redirect response");
          break;
        }
      } else {
        break;
      }
    }
    return { redirectionSteps };
  } catch (error) {
    console.error("Error in unshortenUrl:", error);
    if (error instanceof Error) {
      throw new Error(`URL expansion failed: ${error.message}`);
    } else {
      throw new Error("An unknown error occurred during URL expansion");
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
