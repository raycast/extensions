/**
 * Asking the frontmost browser what page you are actually on.
 *
 * Without this a web capture is filed as coming from "Google Chrome", which is true and
 * useless — a month later the only thing that identifies the source is the article's title
 * and link. macOS will not hand those over through any general API, but the browsers
 * themselves answer over Apple Events.
 *
 * Everything here degrades quietly: no window open, a browser that does not script, a user
 * who declines the automation prompt — the capture still gets saved, just with the app name
 * alone, exactly as before.
 */

import { runAppleScript } from "@raycast/utils";

/** Chromium family: `active tab`, and the title property is `title`. */
const CHROMIUM_BROWSERS = [
  "Google Chrome",
  "Google Chrome Canary",
  "Google Chrome Beta",
  "Chromium",
  "Microsoft Edge",
  "Brave Browser",
  "Arc",
  "Vivaldi",
  "Opera",
  "Dia",
];

/** WebKit family: `current tab`, and the title property is `name`. */
const WEBKIT_BROWSERS = ["Safari", "Safari Technology Preview", "Orion"];

export interface PageSource {
  title?: string;
  url?: string;
}

/**
 * Builds the query for one browser.
 *
 * `appName` is interpolated into the script, so it may only ever be a string that already
 * matched one of the lists above — never whatever `getFrontmostApplication` happened to
 * return. That check is the reason this returns `undefined` for unknown apps rather than
 * attempting a generic script.
 *
 * The two fields are joined *outside* the `tell` block, and this is not cosmetic: inside it,
 * `tab` resolves to the browser's own tab class rather than AppleScript's tab character, and
 * the join silently produces the literal text "tab" between the URL and the title. Keeping
 * `ASCII character 9` out of the application's dictionary is what makes the separator real.
 * A tab is safe as a separator: it cannot occur in a URL, and Jotaid collapses whitespace in
 * the title anyway.
 */
function tabQuery(appName: string): string | undefined {
  const read = CHROMIUM_BROWSERS.includes(appName)
    ? `set theTab to active tab of front window
       set theURL to URL of theTab
       set theTitle to title of theTab`
    : WEBKIT_BROWSERS.includes(appName)
      ? `set theTab to current tab of front window
         set theURL to URL of theTab
         set theTitle to name of theTab`
      : // Firefox is deliberately absent: it exposes no scripting interface for the current tab.
        undefined;

  if (read === undefined) {
    return undefined;
  }

  return `set theURL to ""
set theTitle to ""
tell application "${appName}"
  if (count of windows) > 0 then
    ${read}
  end if
end tell
return theURL & (ASCII character 9) & theTitle`;
}

/**
 * The page open in `appName`, when that app is a browser that can be asked.
 *
 * The timeout matters: a browser busy with a modal dialog will never answer, and a capture
 * that hangs is worse than one filed with a little less provenance.
 */
export async function frontmostPage(appName: string | undefined): Promise<PageSource | undefined> {
  if (appName === undefined) {
    return undefined;
  }
  const script = tabQuery(appName);
  if (script === undefined) {
    return undefined;
  }

  let output: string;
  try {
    output = await runAppleScript(script, { timeout: 3000 });
  } catch {
    // No permission, no window, or the browser did not answer in time.
    return undefined;
  }

  // Only the first tab separates the two fields: a page title is free to contain tabs of its
  // own, and a two-element split would file the capture with everything after the first one
  // thrown away.
  const [url, ...titleParts] = output.split("\t");
  const page: PageSource = {
    url: url?.trim() || undefined,
    title: titleParts.join("\t").trim() || undefined,
  };
  return page.url === undefined && page.title === undefined ? undefined : page;
}
