import { showHUD, Clipboard, showToast, Toast, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { discoverDevicesMulticast, sendFiles } from "./utils/localsend";
import { LocalSendDevice } from "./types";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

const STORAGE_KEY = "last-device";

export default async function Command() {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
        message: "Please copy some text first",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Discovering devices...",
    });

    let device: LocalSendDevice | null = null;

    const lastDeviceJSON = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (lastDeviceJSON) {
      try {
        device = JSON.parse(lastDeviceJSON) as LocalSendDevice;
        toast.message = `Using last device: ${device.alias}`;
      } catch (error) {
        console.error("Failed to parse last device:", error);
      }
    }

    if (!device) {
      const devices = await discoverDevicesMulticast(3000);

      if (devices.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No devices found";
        toast.message = "Make sure LocalSend is running on nearby devices";
        return;
      }

      device = devices[0];
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(device));
    }

    const tmpDir = os.tmpdir();
    const fileName = `clipboard-${Date.now()}.txt`;
    const filePath = path.join(tmpDir, fileName);

    await fs.writeFile(filePath, clipboardText, "utf-8");

    toast.message = `Sending to ${device.alias}...`;

    await sendFiles(
      device,
      [
        {
          path: filePath,
          name: fileName,
          size: Buffer.byteLength(clipboardText, "utf-8"),
          type: "text/plain",
        },
      ],
      undefined,
    );

    await fs.unlink(filePath);

    await showHUD(`✓ Clipboard sent to ${device.alias}`);
  } catch (error) {
    await showFailureToast(error);
  }
}
