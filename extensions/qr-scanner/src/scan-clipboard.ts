import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { decodeQrFromPng } from "./decode";
import { detectContentType } from "./content-type";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Scanning clipboard for QR code...",
  });

  try {
    const clipboardData = await Clipboard.read();

    if (!clipboardData.file) {
      toast.style = Toast.Style.Failure;
      toast.title = "No image found on clipboard";
      toast.message =
        "Please copy an image (e.g., using Snipping Tool or Win+Shift+S) and try again.";
      return;
    }

    const qrContent = await decodeQrFromPng(clipboardData.file);
    if (!qrContent) {
      toast.style = Toast.Style.Failure;
      toast.title = "No QR code found in image";
      toast.message = "Make sure the copied image contains a clear QR code.";
      return;
    }

    const info = detectContentType(qrContent);
    await Clipboard.copy(qrContent);
    await showHUD(`Copied ${info.label} to clipboard`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not scan clipboard";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
