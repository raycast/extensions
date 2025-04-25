import { Detail, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import { toDataURL, toString } from "qrcode";

export async function generateQRCode(
  URL: string | undefined,
  format: "png" | "svg" = "png",
  size: number = format === "svg" ? 1000 : 300
) {
  const toast = await showToast({
    title: "Generating",
    message: "Reading System Clipboard...",
    style: Toast.Style.Animated,
  });

  // Check if URL is undefined
  if (URL === undefined) {
    toast.style = Toast.Style.Failure;
    toast.title = "An error occurred";
    toast.message = "URL is undefined";
    return;
  }

  toast.message = "Generating QR Code...";

  if (format === "svg") {
    const svg = await toString(URL, {
      type: "svg",
      width: size,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff00", // Transparent background
      },
    });
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }

  toast.style = Toast.Style.Success;
  toast.title = "Success";
  toast.message = "Created QR Code";

  return await toDataURL(URL, {
    width: size,
    margin: 1,
  });
}

export function QRCodeView({ qrData }: { qrData: string }) {
  return <Detail isLoading={!qrData} markdown={`![qrcode](${qrData}?raycast-height=355)`} />;
}

export const getQRCodePath = (qrcodeUrl: string, format: "png" | "svg" = "png") => {
  // `https://www.example.com/foo?bar=foo` -> `www.example.com`
  const filename = String(qrcodeUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/\n]+)/gm)).replace(
    /^(?:https?:\/\/)?/gm,
    ""
  );

  return `${homedir()}/Downloads/qrcode-${filename}.${format}`;
};
