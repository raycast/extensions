import { Detail, showToast, Toast, Clipboard } from "@raycast/api";
import { homedir } from "os";
import QRCode from "qrcode";
import { QR_OPTIONS, QR_OPTIONS_PREVIEW, SVG_OPTIONS } from "./config";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import os from "os";
import path from "path";

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

export async function copyQRCodeToClipboard(options: { url: string; format: "png" | "svg" | "png-bg" }): Promise<void> {
  const { url, format } = options;

  try {
    if (format === "svg") {
      const svg = await QRCode.toString(url, {
        type: "svg",
        width: SVG_OPTIONS.width,
        color: SVG_OPTIONS.color,
      });
      const fileName = `qrcode-${Date.now()}.svg`;
      const filePath = path.join(os.tmpdir(), fileName);
      fs.writeFileSync(filePath, svg, "utf-8");
      await Clipboard.copy({ file: filePath });
      await showToast(Toast.Style.Success, "QR Code copied to clipboard");
    } else {
      const fileName = `qrcode-${Date.now()}.png`;
      const filePath = path.join(os.tmpdir(), fileName);
      if (format === "png-bg") {
        await QRCode.toFile(filePath, url, QR_OPTIONS_PREVIEW);
      } else {
        await QRCode.toFile(filePath, url, QR_OPTIONS);
      }
      await Clipboard.copy({ file: filePath });
      await showToast(Toast.Style.Success, "QR Code copied to clipboard");
    }
  } catch (error) {
    await showFailureToast({
      title: "Error",
      message: error instanceof Error ? error.message : "Failed to copy QR code",
    });
    throw error;
  }
}
