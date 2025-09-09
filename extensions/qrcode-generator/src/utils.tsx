import { Detail, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import QRCode from "qrcode";
import { QR_OPTIONS, QR_OPTIONS_PREVIEW, SVG_OPTIONS } from "./config";
import { showFailureToast } from "@raycast/utils";

export async function generateQRCode(options: { URL?: string; format?: "png" | "svg"; preview?: boolean }) {
  const { URL, format = "png", preview = false } = options;
  await showToast({
    title: "Generating",
    message: "Generating QR Code...",
    style: Toast.Style.Animated,
  });

  if (URL === undefined) {
    await showFailureToast({ title: "An error occurred", message: "URL is undefined" });
    return;
  }

  try {
    let result;
    if (format === "svg") {
      const svg = await QRCode.toString(URL, {
        type: "svg",
        width: SVG_OPTIONS.width,
        color: SVG_OPTIONS.color,
      });
      result = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    } else {
      result = await QRCode.toDataURL(URL, preview ? QR_OPTIONS_PREVIEW : QR_OPTIONS);
    }
    await showToast({
      title: "Generated successfully!",
      style: Toast.Style.Success,
    });
    return result;
  } catch (error) {
    await showFailureToast({
      title: "Error",
      message: error instanceof Error ? error.message : "Failed to generate QR code",
    });
    throw error;
  }
}

export function QRCodeView({ qrData, height }: { qrData: string; height: number }) {
  return <Detail isLoading={!qrData} markdown={`![qrcode](${qrData}?raycast-height=${height})`} />;
}

export const getQRCodePath = (qrcodeUrl: string, format: "png" | "svg" = "png") => {
  const match = qrcodeUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/\n]+)/gm);
  if (!match) {
    throw new Error("Invalid URL format");
  }

  const filename = String(match).replace(/^(?:https?:\/\/)?/gm, "");
  return `${homedir()}/Downloads/qrcode-${filename}.${format}`;
};
