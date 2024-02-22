import { Detail, Clipboard, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";

export default function Command() {
  const [qrData, setQrData] = useState<string>();

  async function generateQRCode() {
    const toast = await showToast({
      title: "Generating",
      message: "Reading System Clipboard...",
      style: Toast.Style.Animated,
    });

    // read clipboard content and ensure it's of type string
    const content = await Clipboard.readText();
    if (typeof content !== "string") {
      toast.style = Toast.Style.Failure;
      toast.message = "Content is not text";
      return;
    }
    toast.message = "Generating QR Code...";

    const res = await toDataURL(content);
    setQrData(res);

    toast.style = Toast.Style.Success;
    toast.message = "Created QR Code";
  }

  useEffect(() => {
    generateQRCode();
  });

  return (
    <>
      <Detail isLoading={!qrData} markdown={`![qrcode](${qrData})`} />
    </>
  );
}
