import * as fs from "fs";
import { pathToFileURL } from "url";

interface MediaInfo {
  filePath?: string;
  type: string;
  mimeType?: string;
}

interface BuildMarkdownOptions {
  prefix?: string;
  text?: string;
  media?: MediaInfo;
}

export function buildMarkdownWithMedia({ prefix = "", text, media }: BuildMarkdownOptions): string {
  let markdown = prefix;

  if (media?.filePath && ["photo", "image"].includes(media.type)) {
    try {
      // Reference the cached file rather than inlining it. Raycast's markdown
      // renderer silently drops images embedded as base64 data URIs once they
      // grow large, and a Telegram photo is comfortably past that point -- the
      // detail pane rendered blank for every photo. pathToFileURL handles the
      // percent-encoding the support path needs, and the drive letter and
      // backslashes on Windows.
      if (fs.existsSync(media.filePath)) {
        markdown += `![](${pathToFileURL(media.filePath).href})`;
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
