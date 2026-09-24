/**
 * Scan Current Tab: the tab in front, scanned through the bridge (FEATURES.md F42), saved, and
 * then copied, shown in Finder, opened, or left open in the extension's editor.
 *
 * When there is no browser to ask, the failure says which of the setup steps is missing,
 * because "no browser is connected" is true of all of them. A helper whose Node has gone is
 * repaired here without asking, since the user agreed to the helper when it was installed.
 */
import { homedir } from "node:os";
import { basename, join } from "node:path";
import {
  Clipboard,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  open,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { isSetupMissing, runCli, type CliResult, type ScanAnswer, type StatusAnswer, type TabsAnswer } from "./lib/cli";
import { frontTabUrl } from "./lib/front-tab";
import { helperState, installHelper } from "./lib/helper";
import { pickTab } from "./lib/pick-tab";
import { scanArgs } from "./lib/scan-args";

/** Long enough for a service worker Chrome retired to come back; the CLI's own default is 30. */
const TABS_WAIT_SECONDS = 10;
/** After the helper is written again, Chrome retries the connection on a 30-second backoff. */
const REPAIR_WAIT_SECONDS = 35;
/** A long page takes a while; the CLI's own scan timeout still applies inside this. */
const SCAN_TIMEOUT_MS = 10 * 60_000;

const setUpAction = {
  title: "Set up Page Scanner",
  onAction: () => launchCommand({ name: "set-up", type: LaunchType.UserInitiated }),
};

export default async function scanCurrentTab(): Promise<void> {
  const prefs = getPreferenceValues<Preferences.ScanCurrentTab>();
  const browserArgs = prefs.browser?.trim() ? ["--browser", prefs.browser.trim()] : [];
  const toast = await showToast({ style: Toast.Style.Animated, title: "Finding the tab" });

  try {
    let tabs = await runCli<TabsAnswer>(["tabs", "--wait", String(TABS_WAIT_SECONDS), ...browserArgs]);
    // Nothing set up or nothing connected is repaired; several browsers, or a named one that is
    // not connected, is the user's to choose and is told as the CLI says it.
    if (isSetupMissing(tabs)) {
      const repaired = await repairIfBroken(toast);
      if (!repaired) return;
      tabs = await runCli<TabsAnswer>(["tabs", "--wait", String(REPAIR_WAIT_SECONDS), ...browserArgs], {
        timeoutMs: (REPAIR_WAIT_SECONDS + 15) * 1000,
      });
      if (isSetupMissing(tabs)) return fail(toast, notConnected());
    }
    if (!tabs.answer.ok) return fail(toast, failure(tabs));

    let pick = pickTab(tabs.answer);
    if (pick.kind === "ambiguous") pick = pickTab(tabs.answer, await frontTabUrl());
    if (pick.kind === "none") {
      return fail(toast, {
        title: "No tab to scan",
        message: "Open the page in a browser window first.",
      });
    }
    if (pick.kind === "ambiguous") {
      return fail(toast, {
        title: "Which window?",
        message: `${String(pick.candidates.length)} windows are open, and the browser would not say which is in front. Bring the window forward and run this again.`,
      });
    }

    toast.title = `Scanning ${pick.tab.title || pick.tab.url}`;
    const scan = await runCli<ScanAnswer>(
      scanArgs(prefs, {
        tabId: pick.tab.tabId,
        browserId: tabs.answer.browserId,
        out: saveDirectory(prefs),
      }),
      { timeoutMs: SCAN_TIMEOUT_MS },
    );
    if (!scan.answer.ok) return fail(toast, failure(scan));

    await deliver(scan.answer, prefs.afterScan ?? "copy");
  } catch (error) {
    await fail(toast, {
      title: "Page Scanner did not answer",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function saveDirectory(prefs: Preferences.ScanCurrentTab): string {
  const chosen = prefs.saveDirectory?.trim();
  return chosen ? chosen : join(homedir(), "Downloads");
}

async function deliver(answer: ScanAnswer, after: Preferences.ScanCurrentTab["afterScan"]): Promise<void> {
  const { path } = answer;
  // With `--markdown beside` the text lands next to the file; the file is what is handed on.
  const markdown = answer.page?.markdownPath;
  const name = markdown && markdown !== path ? `${basename(path)} and its Markdown` : basename(path);
  if (after === "editor") {
    // `--open-editor` already opened it in the browser; the file is saved as well.
    await showHUD(`Saved ${name}, and opened it in the editor`);
  } else if (after === "reveal") {
    await showInFinder(path);
    await showHUD(`Saved ${name}`);
  } else if (after === "open") {
    await open(path);
    await showHUD(`Saved ${name}`);
  } else {
    await Clipboard.copy({ file: path });
    await showHUD(`Copied ${name}`);
  }
}

/**
 * No browser answered. Writes the helper again when its Node is gone and says to wait; returns
 * false, having said what is missing, in every other case.
 */
async function repairIfBroken(toast: Toast): Promise<boolean> {
  const status = await runCli<StatusAnswer>(["status"]);
  if (!status.answer.ok) {
    await fail(toast, failure(status));
    return false;
  }
  const state = helperState(status.answer);
  if (state === "missing") {
    await fail(toast, {
      title: "Page Scanner is not set up yet",
      message: "Set it up once, and Raycast can scan from then on.",
      primaryAction: setUpAction,
    });
    return false;
  }
  if (state === "ready") {
    await fail(toast, notConnected());
    return false;
  }
  toast.title = "Repairing the helper";
  toast.message = `The Node it ran on is gone (${status.answer.nativeHost.node ?? "unknown"}).`;
  const installed = await installHelper();
  if (!installed.answer.ok) {
    await fail(toast, failure(installed));
    return false;
  }
  toast.title = "Waiting for the browser to reconnect";
  toast.message = undefined;
  return true;
}

function notConnected(): Toast.Options {
  return {
    title: "No browser is connected",
    message:
      "Keep the browser open. If it still does not connect, open Page Scanner's settings, Local agents, and press Connect.",
    primaryAction: setUpAction,
  };
}

function failure(result: CliResult<unknown>): Toast.Options {
  const answer = result.answer;
  if (answer.ok) return { title: "Page Scanner failed" };
  return {
    title: answer.message,
    ...(answer.hint ? { message: answer.hint } : {}),
    ...(isSetupMissing(result) ? { primaryAction: setUpAction } : {}),
  };
}

async function fail(toast: Toast, options: Toast.Options): Promise<void> {
  toast.style = Toast.Style.Failure;
  toast.title = options.title;
  toast.message = options.message;
  toast.primaryAction = options.primaryAction;
}
