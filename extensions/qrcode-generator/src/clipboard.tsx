import { Detail, Clipboard, Toast, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { toDataURL, toBuffer } from "qrcode";
import fse from "fs-extra";
import { homedir } from "os";

export function buildFileName(path: string, name: string, extension: string) {
  const directoryExists = fse.existsSync(path + name + "." + extension);
  if (!directoryExists) {
    return name + "." + extension;
  } else {
    let index = 2;
    while (directoryExists) {
      const newName = name + "-" + index + "." + extension;
      const directoryExists = fse.existsSync(path + newName);
      if (!directoryExists) {
        return newName;
      }
      index++;
    }
    return name + "-" + index + "." + extension;
  }
}

export default function Command() {
  const [qrData, setQrData] = useState<string>();
  const [clipboardContent, setClipboardContent] = useState<string>();
  const hasCopy = useRef(false);
  async function generateQRCode() {
    if (hasCopy.current) {
      return;
    }
    const toast = await showToast({
      title: "Generating",
      message: "Reading System Clipboard...",
      style: Toast.Style.Animated
    });

    // read clipboard content and ensure it's of type string
    const content = await Clipboard.readText();

    if (typeof content !== "string") {
      toast.style = Toast.Style.Failure;
      toast.message = "Content is not text";
      return;
    }
    toast.message = "Generating QR Code...";
    setClipboardContent(content);
    const res = await toDataURL(content);

    setQrData(res);

    toast.style = Toast.Style.Success;
    toast.message = "Created QR Code";
    hasCopy.current = true;
    try {
      const file = await toBuffer(content);
      const downloadedPath = homedir() + "/Downloads/qrcode/";
      fse.ensureDirSync(downloadedPath);
      const fileName = buildFileName(downloadedPath, "qrcode", "png");
      const filePath = `${downloadedPath}/${fileName}`;
      fse.writeFileSync(filePath, file);
      const fileContent: Clipboard.Content = { file: filePath };
      await Clipboard.copy(fileContent);
    } catch (error) {
      console.log(`Could not copy file. Reason: ${error}`);
    }
  }

  useEffect(() => {
    generateQRCode();
    return () => {
      hasCopy.current = false;
    };
  }, []);

  return (
    <>
      <Detail
        isLoading={!qrData}
        markdown={`
![qrcode](${qrData})

\`\`\`\n${clipboardContent}\n\`\`\`

`}
      />
    </>
  );
}
