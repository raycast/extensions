import { Application, getApplications, getPreferenceValues, open, showHUD, showInFinder } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { mkdir } from "fs/promises";
import { defaultParentDir, formatDate, resolveInside, tildify } from "./lib";
import { FALLBACK_TERMINAL_BUNDLE, defaultTerminalBundleId } from "./macos";
import { openInWindowsTerminal } from "./windows";

const DEFAULT_FORMAT = "yyyy-MM-dd";

async function openInMacTerminal(target: string, app?: Application): Promise<string> {
  if (app) {
    await open(target, app);
    return app.name;
  }
  // Follow the system default terminal; if the registered app is no longer installed, use Terminal.app.
  // LaunchServices stores handler bundle ids lowercased (com.google.chrome for com.google.Chrome),
  // so the comparison must ignore case or apps like Warp (dev.warp.Warp-Stable) are never matched.
  const bundleId = (await defaultTerminalBundleId()).toLowerCase();
  const installed = (await getApplications()).find((candidate) => candidate.bundleId?.toLowerCase() === bundleId);
  await open(target, installed ?? FALLBACK_TERMINAL_BUNDLE);
  return installed?.name ?? "Terminal";
}

// On Windows the folder cannot simply be handed to the app: terminals take a positional argument
// as a command to run, not as a directory to start in, so each one is launched with its working
// directory set instead (Windows Terminal additionally gets `-d`).
const openTerminal = process.platform === "win32" ? openInWindowsTerminal : openInMacTerminal;

export default async function command() {
  try {
    const prefs = getPreferenceValues<Preferences.CreateDatedFolder>();

    const parent = prefs.parentDir?.trim() || defaultParentDir();
    const format = prefs.dateFormat?.trim() || DEFAULT_FORMAT;
    const target = resolveInside(parent, formatDate(format, new Date()));
    if (!target) {
      await showFailureToast(new Error(format), { title: "Folder Name Format must stay inside the parent folder" });
      return;
    }

    await mkdir(target, { recursive: true });

    const terminal = await openTerminal(target, prefs.terminal);

    if (prefs.revealInFinder) {
      await showInFinder(target);
    }

    await showHUD(`📂 ${terminal} → ${tildify(target)}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not create dated folder" });
  }
}
