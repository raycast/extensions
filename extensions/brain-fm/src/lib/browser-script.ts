import { PlayerSnapshot } from "./player-script";

export type SupportedBrowser = "dia" | "chrome" | "brave" | "edge" | "vivaldi";
export interface PlayerTarget {
  browser: SupportedBrowser;
  tabId: string;
}
export type BrowserPlayerSnapshot = PlayerSnapshot & PlayerTarget;

// Browser names come only from this fixed allowlist, never user input.
export const BROWSERS = {
  dia: { name: "Dia", bundleId: "company.thebrowser.dia" },
  chrome: { name: "Google Chrome", bundleId: "com.google.Chrome" },
  brave: { name: "Brave Browser", bundleId: "com.brave.Browser" },
  edge: { name: "Microsoft Edge", bundleId: "com.microsoft.edgemac" },
  vivaldi: { name: "Vivaldi", bundleId: "com.vivaldi.Vivaldi" },
} as const;

export function isSupportedBrowser(value: unknown): value is SupportedBrowser {
  return typeof value === "string" && Object.hasOwn(BROWSERS, value);
}

export function buildBrowserScript(browser: SupportedBrowser): string {
  const name = BROWSERS[browser].name;
  return `
on run argv
  if not application "${name}" is running then error "Open ${name} and your signed-in Brain.fm player first."
  set jsText to item 1 of argv
  set requiredTabId to item 2 of argv
  tell application "${name}"
    set playerTabs to {}
    set seenIds to {}
    repeat with browserWindow in windows
      ${browser === "dia" ? "repeat with browserProfile in profiles of browserWindow\n      set tabURLs to URL of tabs of browserProfile" : "set tabURLs to URL of tabs of browserWindow"}
      repeat with tabIndex from 1 to count of tabURLs
        set tabURL to item tabIndex of tabURLs as text
        if tabURL is "https://my.brain.fm/" or tabURL is "https://my.brain.fm" or tabURL starts with "https://my.brain.fm/player" then
          set browserTab to tab tabIndex of ${browser === "dia" ? "browserProfile" : "browserWindow"}
          set tabId to id of browserTab as text
          if (requiredTabId is "" or tabId is requiredTabId) and seenIds does not contain tabId then
            set end of playerTabs to contents of browserTab
            set end of seenIds to tabId
          end if
        end if
      end repeat
      ${browser === "dia" ? "end repeat" : ""}
    end repeat
    if (count of playerTabs) is 0 then
      if requiredTabId is not "" then error "The original Brain.fm player tab is no longer available. Run the command again."
      error "Open your signed-in Brain.fm player at my.brain.fm in ${name}."
    end if
    if (count of playerTabs) is greater than 1 then error "More than one Brain.fm player tab is open in ${name}. Keep one player tab open so the target is unambiguous."
    set playerTab to item 1 of playerTabs
    set jsonResponse to execute playerTab javascript jsText
    return (id of playerTab as text) & linefeed & jsonResponse
  end tell
end run
`;
}

export function parseBrowserResponse(
  response: string,
  browser: SupportedBrowser,
  target?: PlayerTarget,
): BrowserPlayerSnapshot {
  const separator = response.indexOf("\n");
  const tabId = response.slice(0, separator).trim();
  if (separator < 1 || !tabId || (target && (target.browser !== browser || target.tabId !== tabId))) {
    throw new Error("The browser did not return the original Brain.fm player tab.");
  }
  let snapshot: PlayerSnapshot;
  try {
    snapshot = JSON.parse(response.slice(separator + 1)) as PlayerSnapshot;
  } catch {
    throw new Error("The browser did not return player information. Check its automation permissions and retry.");
  }
  if (snapshot.error) throw new Error(snapshot.error);
  if (!snapshot.mediaSession || !["playing", "paused", "loading", "unavailable"].includes(snapshot.state)) {
    throw new Error("The Brain.fm player returned an unsupported response.");
  }
  return { ...snapshot, browser, tabId };
}
