import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  LaunchType,
  Toast,
  environment,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { loadSettings } from "./lib/settings";
import { scanLocalLibrary } from "./local-library/indexer";
import { indexProgress } from "./local-library/storage";
import type { ExtensionPreferences } from "./preferences";

const run = promisify(execFile);

export default async function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const settings = await loadSettings(preferences);
  const background = environment.launchType === LaunchType.Background;
  if (!settings.localFolders.length) {
    if (!background) await showHUD("Academic: choose folders in Config first");
    return;
  }
  if (background && settings.pauseOnBattery && (await isOnBattery())) return;

  if (!background)
    await showHUD("Academic is indexing the next document batch…");
  try {
    const index = await scanLocalLibrary(settings, preferences, {
      maxDocuments: background
        ? Math.min(2, settings.documentsPerRun)
        : Math.max(10, settings.documentsPerRun),
    });
    const progress = indexProgress(index);
    if (!background) {
      await showToast({
        style: Toast.Style.Success,
        title: `Local library ${progress.percent}% indexed`,
        message: settings.enableExperimentalAnalysis
          ? `${progress.enriched} experimentally analyzed · ${progress.review} need review · ${progress.errors} errors`
          : `${progress.identified} identified · ${progress.review} need review · ${progress.errors} errors · experimental analysis off`,
      });
    }
  } catch (error) {
    if (!background)
      await showToast({
        style: Toast.Style.Failure,
        title: "Local indexing failed",
        message: error instanceof Error ? error.message : String(error),
      });
  }
}

async function isOnBattery(): Promise<boolean> {
  try {
    const { stdout } = await run("/usr/bin/pmset", ["-g", "batt"], {
      timeout: 2_000,
    });
    return /Now drawing from 'Battery Power'/i.test(stdout);
  } catch {
    return false;
  }
}
