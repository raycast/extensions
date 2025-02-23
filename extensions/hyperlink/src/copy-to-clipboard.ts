import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import util from "util";
import { getActiveBrowser, getCurrentTabURL } from "./utils";
import { isBrowserAllowed, DEBUG_MODE } from "./settings";

const execAsync = util.promisify(exec);

export default async function Command() {
  const { name: browser, isFocused } = await getActiveBrowser();

  if (DEBUG_MODE) console.log("🧐 DEBUG: Active browser:", browser);
  if (DEBUG_MODE) console.log("🧐 DEBUG: Browser is focused:", isFocused);

  if (!browser) {
    if (DEBUG_MODE) console.log("❌ DEBUG: No allowed browser is open!");
    await showToast({
      style: Toast.Style.Failure,
      title: "No browser instance running ❌",
      message: "Open an allowed browser and try again.",
    });
    return;
  }

  if (!isBrowserAllowed(browser)) {
    if (DEBUG_MODE) console.log(`❌ DEBUG: Browser ${browser} is not allowed!`);
    await showToast({
      style: Toast.Style.Failure,
      title: `${browser} is not allowed ❌`,
      message: "Check Raycast settings to enable this browser.",
    });
    return;
  }

  if (!isFocused) {
    if (DEBUG_MODE) console.log("❌ DEBUG: No allowed browser is in focus!");
    await showToast({
      style: Toast.Style.Failure,
      title: "No browser in focus ⚠️",
      message: "Ensure an allowed browser is active and try again.",
    });
    return;
  }

  const url = await getCurrentTabURL(browser);

  if (!url) {
    if (DEBUG_MODE) console.log("❌ DEBUG: No URL found!");
    await showToast({
      style: Toast.Style.Failure,
      title: "No URL found ❌",
      message: "Make sure a page is open in the active tab.",
    });
    return;
  }

  await execAsync(`osascript -e 'set the clipboard to "${url}"'`);
  await showToast({
    style: Toast.Style.Success,
    title: "Copied URL to clipboard ✅",
    message: url,
  });
}
