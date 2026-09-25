import { getApplications, open, showHUD } from "@raycast/api";
import { access } from "node:fs/promises";
import { selectYapsApplication } from "./yaps-app-core";

const YAPS_DOWNLOAD_URL = "https://yaps.ai/download";
const DEFAULT_YAPS_APP_PATH = "/Applications/Yaps.app";

export async function openYapsWithFallback(): Promise<void> {
  const application = await installedYapsApplication();
  if (application) {
    await open(application.path);
    return;
  }

  if (await pathExists(DEFAULT_YAPS_APP_PATH)) {
    await open(DEFAULT_YAPS_APP_PATH);
    return;
  }

  await showHUD("Yaps is not installed — opening the download page");
  await open(YAPS_DOWNLOAD_URL);
}

async function installedYapsApplication() {
  try {
    return selectYapsApplication(await getApplications());
  } catch {
    return undefined;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
