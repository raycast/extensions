import {
  Clipboard,
  closeMainWindow,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureDisplay, wait } from "./capture";
import { decodeQrFromPng } from "./decode";
import { detectContentType } from "./content-type";

const SCREENSHOT_DELAY_MS = 250;

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Scanning display...",
  });

  const tempDirectory = await mkdtemp(join(tmpdir(), "raycast-qr-"));
  const screenshotPath = join(tempDirectory, "display.png");

  try {
    await closeMainWindow({ clearRootSearch: true });
    await wait(SCREENSHOT_DELAY_MS);
    await captureDisplay(screenshotPath);

    const qrContent = await decodeQrFromPng(screenshotPath);
    if (!qrContent) {
      toast.style = Toast.Style.Failure;
      toast.title = "No QR code found";
      toast.message = "Use Scan Multiple QR Codes for a deeper scan.";
      return;
    }

    const info = detectContentType(qrContent);
    await Clipboard.copy(qrContent);
    await showHUD(`Copied ${info.label} to clipboard`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not scan display";
    toast.message = error instanceof Error ? error.message : String(error);
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}
