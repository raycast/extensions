import * as fs from "fs";

interface MediaInfo {
  filePath?: string;
  type: string;
  mimeType?: string;
}

interface BuildMarkdownOptions {
  media?: MediaInfo;
  text?: string;
  prefix?: string;
}

export function buildMarkdownWithMedia({ media, text, prefix = "" }: BuildMarkdownOptions): string {
  let markdown = prefix;

  if (media?.filePath && ["photo", "image"].includes(media.type)) {
    try {
      if (fs.existsSync(media.filePath)) {
        const imageBuffer = fs.readFileSync(media.filePath);
        const base64Image = imageBuffer.toString("base64");
        const mimeType = media.mimeType || "image/jpeg";
        markdown += `![](data:${mimeType};base64,${base64Image})`;
      }
    } catch (error) {
      console.error("Failed to read media file:", error);
    }
  }

  if (text) {
    if (markdown) {
      markdown += "\n\n" + text;
    } else {
      markdown = text;
    }
  }

  return markdown;
}
