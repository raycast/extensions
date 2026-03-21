import { Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { IMAGE_FORMATS, FORMATS_REQUIRING_CONVERSION } from "../utils/image-formats";

export type ClipboardItem = {
  offset: number;
  type: "image" | "text";
  content: string;
};

export function useClipboardHistory() {
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);

  useEffect(() => {
    loadClipboardHistory();
  }, []);

  async function loadClipboardHistory() {
    const items: ClipboardItem[] = [];
    const supportedExtensions = [
      ...Object.values(IMAGE_FORMATS).flatMap((fmt) => fmt.extensions.map((ext) => `.${ext}`)),
      ...FORMATS_REQUIRING_CONVERSION.map((ext) => `.${ext}`),
      ".gif",
      ".bmp",
    ];

    for (let offset = 0; offset <= 5; offset++) {
      try {
        const clipboardContent = await Clipboard.read({ offset });

        if (clipboardContent.file) {
          try {
            const filePath = parseFileUrl(clipboardContent.file);
            const lastDot = filePath.lastIndexOf(".");
            const ext = lastDot !== -1 ? filePath.toLowerCase().slice(lastDot) : "";
            const isMacOSClipboardImage = !ext && filePath.includes("/Image ");

            if (supportedExtensions.includes(ext) || isMacOSClipboardImage) {
              items.push({ offset, type: "image", content: filePath });
            }
          } catch {
            continue;
          }
        }

        if (
          clipboardContent.text &&
          !items.find((i) => i.offset === offset) &&
          !clipboardContent.text?.startsWith("Image (")
        ) {
          const text = clipboardContent.text.slice(0, 100);
          items.push({ offset, type: "text", content: text });
        }
      } catch {
        continue;
      }
    }

    setClipboardItems(items);
  }

  function parseFileUrl(fileUrl: string): string {
    const url = new URL(fileUrl);
    return decodeURIComponent(url.pathname);
  }

  return { clipboardItems };
}
