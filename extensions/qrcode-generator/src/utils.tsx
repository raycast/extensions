import { Detail, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import QRCode from "qrcode";
import { QR_OPTIONS, SVG_OPTIONS } from "./config";
import { showFailureToast } from "@raycast/utils";

export async function generateQRCode(URL: string | undefined, format: "png" | "svg" = "png") {
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
    if (format === "svg") {
      const svg = await QRCode.toString(URL, {
        type: "svg",
        width: SVG_OPTIONS.width,
        color: SVG_OPTIONS.color,
      });
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    } else {
      return await QRCode.toDataURL(URL, QR_OPTIONS);
    }
  } catch (error) {
    await showFailureToast({
      title: "Error",
      message: error instanceof Error ? error.message : "Failed to generate QR code",
    });
    throw error;
  }
}

export function QRCodeView({ qrData }: { qrData: string }) {
  return <Detail isLoading={!qrData} markdown={`![qrcode](${qrData}?raycast-height=512)`} />;
}

export const getQRCodePath = (qrcodeUrl: string, format: "png" | "svg" = "png") => {
  const match = qrcodeUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/\n]+)/gm);
  if (!match) {
    throw new Error("Invalid URL format");
  }

  const filename = String(match).replace(/^(?:https?:\/\/)?/gm, "");
  return `${homedir()}/Downloads/qrcode-${filename}.${format}`;
};
