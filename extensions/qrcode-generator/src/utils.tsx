import { Detail, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import QRCode from "qrcode";

const QR_OPTIONS = {
  width: 512,
  color: {
    dark: "#000000",
    light: "#0000", // transparent for PNG, will be handled for SVG
  },
};

export async function generateQRCode(URL: string | undefined, format: "png" | "svg" = "png") {
  const toast = await showToast({
    title: "Generating",
    message: "Generating QR Code...",
    style: Toast.Style.Animated,
  });

  // Check if URL is undefined
  if (URL === undefined) {
    toast.style = Toast.Style.Failure;
    toast.title = "An error occurred";
    toast.message = "URL is undefined";
    return;
  }

  try {
    if (format === "svg") {
      const svg = await QRCode.toString(URL, {
        type: "svg",
        width: QR_OPTIONS.width,
        color: { dark: QR_OPTIONS.color.dark, light: "none" },
      });
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    } else {
      return await QRCode.toDataURL(URL, QR_OPTIONS);
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = error instanceof Error ? error.message : "Failed to generate QR code";
    return;
  }
}

export function QRCodeView({ qrData }: { qrData: string }) {
  return <Detail isLoading={!qrData} markdown={`![qrcode](${qrData}?raycast-height=512)`} />;
}

export const getQRCodePath = (qrcodeUrl: string, format: "png" | "svg" = "png") => {
  // `https://www.example.com/foo?bar=foo` -> `www.example.com`
  const filename = String(qrcodeUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/\n]+)/gm)).replace(
    /^(?:https?:\/\/)?/gm,
    ""
  );

  return `${homedir()}/Downloads/qrcode-${filename}.${format}`;
};
