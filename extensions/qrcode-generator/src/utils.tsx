import { Detail, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import { toDataURL } from "qrcode";

export async function generateQRCode(URL: string | undefined) {
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

  toast.style = Toast.Style.Success;
  toast.title = "Success";
  toast.message = "Created QR Code";

  return await toDataURL(URL);
}

export function QRCodeView({ qrData }: { qrData: string }) {
  return <Detail isLoading={!qrData} markdown={`![qrcode](${qrData}?raycast-height=355)`} />;
}

export const getQRCodePath = (qrcodeUrl: string) => {
  // `https://www.example.com/foo?bar=foo` -> `www.example.com`
  const filename = String(qrcodeUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/\n]+)/gm)).replace(
    /^(?:https?:\/\/)?/gm,
    ""
  );

  return `${homedir()}/Downloads/qrcode-${filename}.png`;
};
