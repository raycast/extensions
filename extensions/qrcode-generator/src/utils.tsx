import { Detail, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import QRCode from "qrcode";
import { JPEG_OPTIONS, PNG_OPTIONS, SVG_OPTIONS } from "./config";
import { showFailureToast } from "@raycast/utils";

export async function generateQRCode(URL: string | undefined, format: "png" | "svg" | "jpeg" = "png") {
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
    switch (format) {
      case "svg":
        const svg = await QRCode.toString(URL, {
          type: "svg",
          width: SVG_OPTIONS.width,
          color: SVG_OPTIONS.color,
        });
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
      case "png":
        return await QRCode.toDataURL(URL, PNG_OPTIONS);
      case "jpeg":
        return await QRCode.toDataURL(URL, JPEG_OPTIONS);
      default:
        throw new Error("No format selected");
    }
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

export const getQRCodePath = (qrcodeUrl: string, format: "png" | "svg" | "jpeg" = "png") => {
  const match = qrcodeUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/\n]+)/gm);
  if (!match) {
    throw new Error("Invalid URL format");
  }

  const filename = String(match).replace(/^(?:https?:\/\/)?/gm, "");
  return `${homedir()}/Downloads/qrcode-${filename}.${format}`;
};
