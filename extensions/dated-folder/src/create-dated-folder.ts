import { Application, getApplications, getPreferenceValues, open, showHUD, showInFinder } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { mkdir } from "fs/promises";
import { homedir } from "os";
import {
  FALLBACK_TERMINAL_BUNDLE,
  defaultParentDir,
  defaultTerminalBundleId,
  formatDate,
  isWindows,
  openTerminalWindows,
  resolveInside,
} from "./lib";

interface Preferences {
  parentDir?: string;
  terminal?: Application;
  dateFormat?: string;
  revealInFinder: boolean;
}

const DEFAULT_FORMAT = "yyyy-MM-dd";

async function openTerminalMac(target: string, app?: Application): Promise<string> {
  if (app) {
    await open(target, app);
    return app.name;
  }
  // Follow the system default terminal; if the registered app is no longer installed, use Terminal.app.
  const bundleId = await defaultTerminalBundleId();
  const installed = (await getApplications()).find((candidate) => candidate.bundleId === bundleId);
  await open(target, installed ?? FALLBACK_TERMINAL_BUNDLE);
  return installed?.name ?? "Terminal";
}

export default async function command() {
  try {
    const prefs = getPreferenceValues<Preferences>();

    const parent = prefs.parentDir?.trim() || (await defaultParentDir());
    const format = prefs.dateFormat?.trim() || DEFAULT_FORMAT;
    const target = resolveInside(parent, formatDate(format, new Date()));
    if (!target) {
      await showFailureToast(new Error(format), { title: "Folder Name Format must stay inside the parent folder" });
      return;
    }

    await mkdir(target, { recursive: true });

    const terminal = isWindows
      ? await openTerminalWindows(target, prefs.terminal)
      : await openTerminalMac(target, prefs.terminal);

    if (prefs.revealInFinder) {
      await showInFinder(target);
    }

    await showHUD(`📂 ${terminal} → ${target.replace(homedir(), "~")}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not create dated folder" });
  }
}
