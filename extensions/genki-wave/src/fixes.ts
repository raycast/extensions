import { open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { extensionFolder, helperPath, turnOnBluetooth } from "./helper";
import * as listener from "./listener";
import type { Fix } from "./summary";

const run = promisify(execFile);

/**
 * Carries out a `fixFor` action that needs no navigation (Choose Wave is pushed or
 * launched by the caller). Returns what to tell the user.
 */
export async function applyFix(fix: Exclude<Fix, "chooseWave">): Promise<string> {
  switch (fix) {
    case "reinstallListener":
      // A fresh copy and agent, e.g. after something removed the copy's executable bit.
      await listener.stop().catch(() => undefined);
      await listener.start(await helperPath(), extensionFolder());
      return "Listener reinstalled";
    case "startListener":
      await listener.start(await helperPath(), extensionFolder());
      return "Listener started";
    case "enableBluetooth":
      await turnOnBluetooth();
      return "Bluetooth on";
    case "bluetoothSettings":
      await open("x-apple.systempreferences:com.apple.preference.security?Privacy_Bluetooth");
      return "Allow wave-helper, then come back";
    case "updateFirmware":
      try {
        await run("/usr/bin/open", ["-b", "com.genkiinstruments.softwave"]);
      } catch {
        throw new Error("Softwave isn't installed; get it from Genki to update your ring");
      }
      return "Update the ring in Softwave, then quit Softwave";
    case "restartListener":
      await listener.restart();
      return "Reconnecting…";
  }
}

/** Restarts the listener so it picks up a change; says so if launchd refuses. */
export async function restartListener() {
  try {
    await listener.restart();
  } catch (e) {
    await showFailureToast(e, { title: "Couldn't restart Wave" });
  }
}
