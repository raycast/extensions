import { runAppleScript } from "@raycast/utils";
import { setTimeout } from "timers/promises";
import { findTab, toAutomationError } from "../find-tab";
import { escapeAppleScriptString } from "../utils";

const DEFAULT_MAX_LENGTH = 20000;
const MAX_LENGTH_CAP = 50000;
const LOADING_TIMEOUT_MS = 5000;
const LOADING_POLL_MS = 250;

const JAVASCRIPT_FLAG_ERROR =
  "Reading page contents requires Dia to allow JavaScript from AppleScript. Quit Dia, then reopen it from Terminal with: open -a Dia --args --enable-applescript-javascript";

// Declared inline rather than extending TabTarget: Raycast's tool schema extraction drops inherited properties
type Input = {
  /**
   * The ID of the tab, when known from a previous tool result.
   */
  tabId?: string;

  /**
   * Text matched against tab titles and URLs (case-insensitive), e.g. "github" or "Hacker News".
   *
   * @remarks
   * Ignored when tabId is provided. Omit both tabId and query to target the focused tab.
   */
  query?: string;

  /**
   * The maximum number of characters of page text to return.
   *
   * @default 20000
   * @remarks
   * Capped at 50000. Longer pages are truncated.
   */
  maxLength?: number;
};

type PageText = { title: string; url: string; readyState: string; length: number; text: string };

/**
 * Returns the visible text of a Dia tab, or of the focused tab when no tab is specified.
 * Use it to read, summarize or answer questions about a page.
 */
export default async function tool(input: Input) {
  const maxLength = Math.min(Math.max(Math.floor(input.maxLength ?? DEFAULT_MAX_LENGTH), 1), MAX_LENGTH_CAP);
  const tab = await findTab(input);
  const tabSpecifier = `tab id "${escapeAppleScriptString(tab.tabId)}" of window id "${escapeAppleScriptString(tab.windowId)}"`;

  const stillLoading = await waitUntilLoaded(tabSpecifier).catch((error) => {
    throw toReadError(error, tab.title);
  });

  // Read title and URL with the text, since the tab may have navigated since findTab.
  // Truncate inside the page so huge documents never cross the AppleScript bridge.
  const javascript = `JSON.stringify((() => {
    const text = document.body ? document.body.innerText : "";
    return {
      title: document.title,
      url: location.href,
      readyState: document.readyState,
      length: text.length,
      text: text.slice(0, ${maxLength}),
    };
  })())`;

  let result: string;
  try {
    result = await runAppleScript(
      `tell application "Dia" to execute ${tabSpecifier} javascript "${escapeAppleScriptString(javascript)}"`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("enable-applescript-javascript") || message.includes("-10006")) {
      throw new Error(JAVASCRIPT_FLAG_ERROR);
    }
    if (message.includes("-1743") || message.includes("-1728")) {
      throw toReadError(error, tab.title);
    }
    throw new Error(`Couldn't read "${tab.title}". Dia's own pages, such as settings or a new tab, can't be read.`);
  }

  let page: PageText;
  try {
    page = JSON.parse(result);
  } catch {
    throw new Error(`Couldn't read "${tab.title}": the page returned no text. JavaScript may be blocked on this page.`);
  }

  if (!page.text.trim()) {
    if (stillLoading || page.readyState === "loading") {
      throw new Error(`"${page.title || tab.title}" is still loading. Try again in a moment.`);
    }
    throw new Error(
      `"${page.title || page.url}" has loaded, but the page has no readable text (it may contain only images or media). Its contents can't be summarized.`,
    );
  }

  return {
    tabId: tab.tabId,
    title: page.title,
    url: page.url,
    loading: stillLoading || page.readyState === "loading",
    truncated: page.length > page.text.length,
    text: page.text,
  };
}

/** Turns AppleScript failures into messages that say what to do: grant Automation access, or the tab is gone. */
function toReadError(error: unknown, title: string): unknown {
  if (error instanceof Error && error.message.includes("-1728")) {
    return new Error(`"${title}" is no longer open.`);
  }
  return toAutomationError(error);
}

/** Waits for the tab to finish loading, up to a timeout. Returns whether it is still loading. */
async function waitUntilLoaded(tabSpecifier: string): Promise<boolean> {
  const deadline = Date.now() + LOADING_TIMEOUT_MS;
  for (;;) {
    const loading = (await runAppleScript(`tell application "Dia" to return loading of ${tabSpecifier}`)).trim();
    if (loading !== "true") return false;
    if (Date.now() >= deadline) return true;
    await setTimeout(LOADING_POLL_MS);
  }
}
