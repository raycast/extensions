import { Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";

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
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".heic", ".heif"];

    for (let offset = 0; offset <= 5; offset++) {
      try {
        const clipboardContent = await Clipboard.read({ offset });

        if (clipboardContent.file) {
          try {
            const filePath = parseFileUrl(clipboardContent.file);
            const lastDot = filePath.lastIndexOf(".");
            const ext = lastDot !== -1 ? filePath.toLowerCase().slice(lastDot) : "";

            if (imageExtensions.includes(ext) || !ext) {
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
