import {
  closeMainWindow,
  getPreferenceValues,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const SEARCH_BROWSER_BUNDLE_ID = "com.officecommun.search";

const SEARCH_URL_TEMPLATES: Record<string, string> = {
  google: "https://www.google.com/search?q={query}",
  duckduckgo: "https://duckduckgo.com/?q={query}",
  bing: "https://www.bing.com/search?q={query}",
  ecosia: "https://www.ecosia.org/search?q={query}",
  startpage: "https://www.startpage.com/sp/search?query={query}",
  kagi: "https://kagi.com/search?q={query}",
  brave: "https://search.brave.com/search?q={query}",
  qwant: "https://www.qwant.com/?q={query}",
};

function normalizeDirectURL(input: string): string | undefined {
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(input)
    ? input
    : /^[\w-]+(?:\.[\w-]+)+(?:[:/ ?#][^\s]*)?$/i.test(input)
      ? `https://${input}`
      : undefined;

  if (!candidate) return undefined;

  try {
    const parsedURL = new URL(candidate);
    return parsedURL.protocol === "https:" || parsedURL.protocol === "http:"
      ? parsedURL.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function buildSearchURL(template: string, query: string): string {
  const encodedQuery = encodeURIComponent(query);
  const url = template.trim().replaceAll("{query}", encodedQuery);
  const parsedURL = new URL(url);

  if (parsedURL.protocol !== "https:" && parsedURL.protocol !== "http:") {
    throw new Error("The search URL must use http or https.");
  }

  return parsedURL.toString();
}

export default async function OpenInSearch({
  arguments: { query },
}: LaunchProps<{ arguments: Arguments.OpenInSearch }>) {
  const input = query.trim();

  if (!input) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Enter a URL or search query in Raycast",
    });
    return;
  }

  try {
    const preferences = getPreferenceValues<Preferences>();
    const directURL = normalizeDirectURL(input);
    const useBrowserSearchEngine = preferences.useBrowserSearchEngine !== false;
    const target =
      directURL ??
      (useBrowserSearchEngine
        ? input
        : buildSearchURL(
            SEARCH_URL_TEMPLATES[preferences.searchEngine ?? "google"] ??
              SEARCH_URL_TEMPLATES.google,
            input,
          ));
    await closeMainWindow();
    await runAppleScript(
      `on run argv
  set targetURL to item 1 of argv
  tell application id "${SEARCH_BROWSER_BUNDLE_ID}" to activate
  tell application "System Events"
    tell process "Search"
      keystroke "t" using {command down}
      delay 0.15
      keystroke "l" using {command down}
      keystroke targetURL
      key code 36
    end tell
  end tell
end run`,
      [target],
    );
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open in Search Browser" });
  }
}
