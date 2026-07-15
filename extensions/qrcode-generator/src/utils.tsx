import { Action, ActionPanel, Detail, showToast, Toast, Clipboard } from "@raycast/api";
import { homedir } from "os";
import QRCode from "qrcode";
import { buildQrOptions, buildSvgOptions, DEFAULT_COLOR } from "./config";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import os from "os";
import path from "path";

/** Render a QR code as an SVG string in the given color. */
function renderSvg(content: string, color: string): Promise<string> {
  return QRCode.toString(content, { type: "svg", ...buildSvgOptions({ color }) });
}

/** Write a QR code to `filePath` (SVG text or PNG; `png-bg` adds a white background). */
async function writeQRCodeFile(
  filePath: string,
  content: string,
  format: "png" | "svg" | "png-bg",
  color: string,
): Promise<void> {
  if (format === "svg") {
    fs.writeFileSync(filePath, await renderSvg(content, color), "utf-8");
  } else {
    await QRCode.toFile(filePath, content, buildQrOptions({ color, preview: format === "png-bg" }));
  }
}

export async function generateQRCode(options: {
  URL?: string;
  format?: "png" | "svg";
  preview?: boolean;
  color?: string;
}) {
  const { URL, format = "png", preview = false, color = DEFAULT_COLOR } = options;
  await showToast({
    title: "Generating",
    message: "Generating QR Code...",
    style: Toast.Style.Animated,
  });

  if (URL === undefined) {
    await showFailureToast(new Error("URL is undefined"), { title: "An error occurred" });
    return;
  }

  try {
    let result;
    if (format === "svg") {
      const svg = await renderSvg(URL, color);
      result = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    } else {
      result = await QRCode.toDataURL(URL, buildQrOptions({ color, preview }));
    }
    await showToast({
      title: "Generated successfully!",
      style: Toast.Style.Success,
    });
    return result;
  } catch (error) {
    await showFailureToast(error, { title: "Failed to generate QR code" });
    throw error;
  }
}

export function QRCodeView({ qrData, height, onBack }: { qrData: string; height: number; onBack: () => void }) {
  return (
    <Detail
      isLoading={!qrData}
      markdown={`![qrcode](${qrData}?raycast-height=${height})`}
      actions={
        <ActionPanel>
          <Action title="Edit QR Code" onAction={onBack} />
        </ActionPanel>
      }
    />
  );
}

export const getQRCodePath = (qrcodeUrl: string, format: "png" | "svg" = "png") => {
  const match = qrcodeUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/\n]+)/gm);
  if (!match) {
    throw new Error("Invalid URL format");
  }

  const filename = String(match).replace(/^(?:https?:\/\/)?/gm, "");
  return `${homedir()}/Downloads/qrcode-${filename}.${format}`;
};

/** Write a QR code to ~/Downloads in the given format/color and return the saved file path. */
export async function saveQRCode(options: {
  url: string;
  format: "png" | "svg" | "png-bg";
  color?: string;
}): Promise<string> {
  const { url, format, color = DEFAULT_COLOR } = options;
  const basePath = getQRCodePath(url, "png");
  const filePath = format === "svg" ? basePath.replace(/\.png$/, ".svg") : basePath;

  await writeQRCodeFile(filePath, url, format, color);
  return filePath;
}

export async function copyQRCodeToClipboard(options: {
  url: string;
  format: "png" | "svg" | "png-bg";
  color?: string;
}): Promise<void> {
  const { url, format, color = DEFAULT_COLOR } = options;

  try {
    const ext = format === "svg" ? "svg" : "png";
    const filePath = path.join(os.tmpdir(), `qrcode-${Date.now()}.${ext}`);
    await writeQRCodeFile(filePath, url, format, color);
    await Clipboard.copy({ file: filePath });
    await showToast(Toast.Style.Success, "QR Code copied to clipboard");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to copy QR code" });
    throw error;
  }
}
