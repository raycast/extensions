import { Clipboard, Toast, closeMainWindow, showToast } from "@raycast/api";

import { decodeFirstQrCodeFromClipboard } from "./qr-from-clipboard";

export default async function Command() {
  await closeMainWindow({ clearRootSearch: true });

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Decoding QR code...",
  });

  try {
    const decodedValue = await decodeFirstQrCodeFromClipboard();

    await Clipboard.copy(decodedValue);

    toast.style = Toast.Style.Success;
    toast.title = "Copied to clipboard";
    toast.message = getSuccessMessage(decodedValue);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";

    toast.style = Toast.Style.Failure;
    toast.title = "Decode failed";
    toast.message = getFailureMessage(message);
  }
}

function getSuccessMessage(decodedValue: string): string {
  if (looksLikeJson(decodedValue)) {
    return "Valid JSON/JS object copied";
  }

  return "QR content copied";
}

function getFailureMessage(message: string): string {
  if (message.includes("No image found")) {
    return "Copy an image with a QR code first";
  }

  if (message.includes("No QR code found")) {
    return "Please copy an image that contains a readable QR code";
  }

  return message;
}

function looksLikeJson(value: string): boolean {
  const trimmedValue = value.trim();

  return (
    (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) ||
    (trimmedValue.startsWith("[") && trimmedValue.endsWith("]"))
  );
}
