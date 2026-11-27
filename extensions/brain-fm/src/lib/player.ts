import { getPreferenceValues, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import {
  BROWSERS,
  buildBrowserScript,
  BrowserPlayerSnapshot,
  isSupportedBrowser,
  parseBrowserResponse,
  PlayerTarget,
  SupportedBrowser,
} from "./browser-script";
import { buildPlayerScript, PlaybackAction, PlayerSnapshot } from "./player-script";
import { controlWithReader } from "./verify-control";

export function selectedBrowser(): SupportedBrowser {
  const { browser } = getPreferenceValues<Preferences>();
  if (!isSupportedBrowser(browser)) throw new Error("Choose your Brain.fm browser in extension preferences.");
  return browser;
}

/** Opens Brain.fm in the browser the extension controls, not the default browser. */
export async function openBrainFm(): Promise<void> {
  await open("https://my.brain.fm/", BROWSERS[selectedBrowser()].bundleId);
}

function friendlyBrowserError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/timed out|timeout|ETIMEDOUT/i.test(message)) {
    return new Error("The browser did not respond in time. Close any browser dialogs, then retry.");
  }
  if (/not authorized|not permitted|\(-1743\)/i.test(message)) {
    return new Error(
      "Allow Raycast to control your selected browser in System Settings → Privacy & Security → Automation.",
    );
  }
  if (/javascript.*apple events|javascript.*disabled|executing javascript.*not allowed/i.test(message)) {
    return new Error(
      "Your browser blocks JavaScript from Apple Events. Enable its browser automation setting, then retry.",
    );
  }
  return new Error(message.replace(/^execution error:\s*/i, "").replace(/\s*\(-?\d+\)\s*$/, ""));
}

export async function readOrControl(action: PlaybackAction, target?: PlayerTarget): Promise<BrowserPlayerSnapshot> {
  const browser = target?.browser ?? selectedBrowser();
  let response: string;
  try {
    response = await runAppleScript(buildBrowserScript(browser), [buildPlayerScript(action), target?.tabId ?? ""], {
      timeout: 10_000,
    });
  } catch (error) {
    throw friendlyBrowserError(error);
  }
  return parseBrowserResponse(response, browser, target);
}

export async function controlAndVerify(
  action: Exclude<PlaybackAction, "status">,
  target?: PlayerTarget,
): Promise<PlayerSnapshot> {
  return controlWithReader(action, readOrControl, target);
}
