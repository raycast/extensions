import * as readline from "node:readline";
import { runAppleScript } from "@raycast/utils";
import { MozeidonBookmark, MozeidonTab, Tab, TabState } from "../interfaces";
import { execSync, spawn } from "child_process";
import {
  FIREFOX_OPEN_COMMAND,
  MOZEIDON,
  MOZEIDON_DOCUMENTATION_URL,
  SEARCH_ENGINE,
  SEARCH_ENGINES,
  TABS_FALLBACK,
  TAB_TYPE,
} from "../constants";

export function openNewTab(queryText: string | null | undefined): void {
  // default empty query for empty tab
  let query = "";

  if (queryText) {
    try {
      query = ` -- "${new URL(queryText).toString()}"`;

      // not a valid url, then it should open a search-engine request
    } catch (_) {
      const encodedQuery = encodeURIComponent(queryText);
      query = ` -- "${SEARCH_ENGINES[SEARCH_ENGINE]}${encodedQuery}"`;
    }
  }

  execSync(`${MOZEIDON} tabs new${query}`);
  openFirefox();
}

export function switchTab(tab: Tab): void {
  execSync(`${MOZEIDON} tabs switch ${tab.windowId}:${tab.id}`);
  openFirefox();
}

export function closeTab(tab: Tab): void {
  execSync(`${MOZEIDON} tabs close ${tab.windowId}:${tab.id}`);
}

export function fetchOpenTabs(): TabState {
  const data = execSync(`${MOZEIDON} tabs get`);
  const parsedTabs: { data: MozeidonTab[] } = JSON.parse(data.toString() || TABS_FALLBACK);
  return {
    type: TAB_TYPE.OPENED_TABS,
    tabs: parsedTabs.data.map(
      (mozTab) =>
        new Tab(
          mozTab.id.toString(),
          mozTab.pinned,
          mozTab.windowId,
          mozTab.title,
          mozTab.url,
          mozTab.domain,
          mozTab.active,
        ),
    ),
  };
}

export function fetchRecentlyClosedTabs(): TabState {
  const data = execSync(`${MOZEIDON} tabs get --closed`);
  const parsedTabs: { data: MozeidonTab[] } = JSON.parse(data.toString() || TABS_FALLBACK);
  return {
    type: TAB_TYPE.RECENTLY_CLOSED,
    tabs: parsedTabs.data.map(
      (mozTab) =>
        new Tab(
          mozTab.id.toString(),
          mozTab.pinned,
          mozTab.windowId,
          mozTab.title,
          mozTab.url,
          mozTab.domain,
          mozTab.active,
        ),
    ),
  };
}

export async function* getBookmarksChunks() {
  const command = spawn(`${MOZEIDON} bookmarks -c 1000`, { shell: true });
  const chunks = readline.createInterface({ input: command.stdout });
  for await (const chunk of chunks) {
    const { data: parsedBookmarks }: { data: MozeidonBookmark[] } = JSON.parse(chunk);
    yield parsedBookmarks.map(
      (mozBookmark) => new Tab(mozBookmark.id, false, 0, mozBookmark.title, mozBookmark.url, mozBookmark.parent, false),
    );
  }
}

export function openFirefox() {
  execSync(FIREFOX_OPEN_COMMAND);
}

export function openFirefoxAtMozeidonPage() {
  execSync(`${FIREFOX_OPEN_COMMAND} ${MOZEIDON_DOCUMENTATION_URL}`);
}

export async function startFirefox() {
  await runAppleScript(`
try
tell application "Firefox" to activate
end try
`);
}

export async function isFirefoxRunning() {
  const isFirefoxRunning = await runAppleScript(`
set isRunning to false
try
  tell application "System Events"
    if (get name of every application process) contains "Firefox" then
      set isRunning to true
    end if
  end tell
end try
return isRunning`);
  if (isFirefoxRunning === "false") {
    return false;
  }
  return true;
}
