import { closeMainWindow, open, PopToRootType, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const macShotBundleIdentifier = "com.sw33tlie.macshot.macshot";
const launchTimeoutMilliseconds = 2000;
const pollIntervalMilliseconds = 100;
const launchSettleMilliseconds = 250;

export async function openMacShot(action: string, title: string) {
  try {
    await ensureMacShotIsRunning();
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
    await open(`macshot://${action}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not ${title.toLowerCase()}`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function ensureMacShotIsRunning() {
  if (await isMacShotRunning()) {
    return;
  }

  await launchMacShot();
  await waitForMacShot();
  await sleep(launchSettleMilliseconds);
}

async function isMacShotRunning() {
  try {
    await execFileAsync("pgrep", ["-x", "macshot"]);
    return true;
  } catch {
    return false;
  }
}

async function launchMacShot() {
  try {
    await execFileAsync("open", ["-b", macShotBundleIdentifier]);
  } catch {
    await execFileAsync("open", ["-a", "macshot"]);
  }
}

async function waitForMacShot() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < launchTimeoutMilliseconds) {
    if (await isMacShotRunning()) {
      return;
    }

    await sleep(pollIntervalMilliseconds);
  }

  throw new Error("macshot did not start within 2 seconds.");
}

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
