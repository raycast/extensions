import { closeMainWindow, Clipboard, LaunchProps, showToast, Toast, open } from "@raycast/api";
import { getSearchUrl } from "./search-engines";

export const DIA_BUNDLE_ID = "company.thebrowser.dia";

function isLikelyURL(str: string): boolean {
  if (/^\S+:\/\//.test(str)) return true;
  if (/^localhost(:\d+)?/.test(str)) return true;
  // Bare domain: word.tld pattern
  return /^[\w-]+(\.[\w-]+)+/.test(str);
}

function normalizeURL(input: string): string {
  const trimmed = input.trim();
  if (/^\S+:\/\//.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Turns a URL-like input into a URL, and anything else into a search with the configured engine. */
export function toDiaURL(target: string): string {
  return isLikelyURL(target) ? normalizeURL(target) : getSearchUrl(target);
}

export default async function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  try {
    let target = props.arguments.url?.trim() || props.fallbackText?.trim();

    if (!target) {
      const clipboard = await Clipboard.readText();
      if (clipboard && isLikelyURL(clipboard.trim())) {
        target = clipboard.trim();
      }
    }

    if (!target) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No URL provided",
        message: "Pass a URL as argument or copy one to clipboard",
      });
      return;
    }

    const url = toDiaURL(target);

    await closeMainWindow();
    await open(url, DIA_BUNDLE_ID);
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to open URL in Dia" });
  }
}
