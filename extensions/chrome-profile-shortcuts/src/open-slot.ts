import { showHUD, showToast, Toast, closeMainWindow, popToRoot, Clipboard } from "@raycast/api";
import { getProfileForSlot } from "./util/storage";
import { openGoogleChrome } from "./util/util";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { GoogleChromeLocalState } from "./util/types";

export const openSlot = async (slot: number) => {
  try {
    const profileDirectory = await getProfileForSlot(slot);

    if (!profileDirectory) {
      await showHUD(`No profile assigned to Slot ${slot} ⚠️`);
      return;
    }

    // Fetch profile name from Local State
    let profileName: string | undefined;
    try {
      const path = join(homedir(), "Library/Application Support/Google/Chrome/Local State");
      const localStateFileBuffer = await readFile(path);
      const localStateFileText = localStateFileBuffer.toString("utf-8");
      const localState = JSON.parse(localStateFileText) as GoogleChromeLocalState;
      const infoCache = localState.profile.info_cache;

      if (infoCache && infoCache[profileDirectory]) {
        profileName = infoCache[profileDirectory].name;
      }
    } catch (e) {
      console.error("Error reading Local State:", e);
    }

    if (!profileName) {
      throw new Error(`Could not determine profile name for directory: ${profileDirectory}`);
    }

    await openGoogleChrome(
      profileDirectory,
      "",
      async () => {
        await showHUD(`Opening Slot ${slot}...`);
      },
      profileName,
    );

    await popToRoot();
    await closeMainWindow();
  } catch (error) {
    console.error("Failed to open slot:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open slot",
      message: String(error),
      primaryAction: {
        title: "Copy Error",
        onAction: () => Clipboard.copy(String(error)),
      },
    });
  }
};
