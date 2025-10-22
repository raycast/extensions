import fs from "fs";
import os from "os";
import path from "path";

import { environment } from "@raycast/api";

export const fileIcon = "/System/Applications/Notes.app";

export function escapeDoubleQuotes(value: string) {
  return value.replace(/"/g, '\\"');
}

export function truncate(str: string, maxLength = 30): string {
  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength) + "…";
}

export function getOpenNoteURL(uuid: string) {
  const isSonomaOrLater = parseInt(os.release().split(".")[0]) >= 23;
  return `${isSonomaOrLater ? "applenotes" : "notes"}://showNote?identifier=${uuid}`;
}

/**
 * Strips large base64-encoded images from HTML content and extracts them to temp files
 * Small images (< 1MB) are kept inline as base64
 * Larger images (>= 1MB) are extracted to temp files and referenced by file path
 * @param htmlContent - The HTML content to process
 * @returns HTML with large base64 images replaced with file references
 */
export function stripLargeImagesFromHtml(htmlContent: string): string {
  const tempDir = path.join(environment.supportPath, "temp-images");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  let imageCounter = 0;

  const imgDataUrlPattern = /<img([^>]*)src=["']data:image\/([^;]+);base64,([^"']+)["']([^>]*)>/gi;

  const processedHtml = htmlContent.replace(imgDataUrlPattern, (match, beforeSrc, imageType, base64Data, afterSrc) => {
    const base64Length = base64Data.length;
    const approximateSizeMB = (base64Length * 0.75) / (1024 * 1024);

    const SMALL_IMAGE_THRESHOLD_MB = 1;
    if (approximateSizeMB < SMALL_IMAGE_THRESHOLD_MB) {
      return match;
    }

    try {
      imageCounter++;
      const timestamp = Date.now();
      const filename = `note-image-${timestamp}-${imageCounter}.${imageType.toLowerCase()}`;
      const tempFilePath = path.join(tempDir, filename);

      const imageBuffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(tempFilePath, new Uint8Array(imageBuffer));

      return `<img${beforeSrc} src="${tempFilePath}"${afterSrc}>`;
    } catch (error) {
      const sizeStr = approximateSizeMB.toFixed(1);
      const typeStr = imageType.toUpperCase();
      return `<p><em>🖼️ [${typeStr} Image - ${sizeStr}MB - Could not extract. Open in Apple Notes to view.]</em></p>`;
    }
  });

  // Also handle style attributes with base64 background images (remove these entirely)
  const withoutDataBackgrounds = processedHtml.replace(
    /style=["'][^"']*background(-image)?:\s*url\(["']?data:image\/[^;]+;base64,[^)"']*["']?\)[^"']*["']/gi,
    "",
  );

  return withoutDataBackgrounds;
}

/**
 * Cleans up old temporary image files to prevent disk space issues
 * Removes images older than 1 hour
 */
export function cleanupTempImages(): void {
  try {
    const tempDir = path.join(environment.supportPath, "temp-images");
    if (!fs.existsSync(tempDir)) {
      return;
    }

    const now = Date.now();
    const maxAge = 1 * 60 * 60 * 1000;

    const files = fs.readdirSync(tempDir);
    files.forEach((file: string) => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.error("Failed to cleanup temp images:", error);
  }
}

/**
 * Converts HTML content to Markdown with memory-safe settings
 * Small images (< 1MB) remain as base64, larger images are extracted to temp files
 * @param htmlContent - The HTML content to convert
 * @returns Markdown string with image references
 */
export async function convertHtmlToMarkdownSafely(htmlContent: string): Promise<string> {
  try {
    cleanupTempImages();

    const contentSizeInMB = new TextEncoder().encode(htmlContent).length / (1024 * 1024);
    if (contentSizeInMB > 50) {
      throw new Error(
        `Note content is too large (${contentSizeInMB.toFixed(1)}MB). Please open this note in the Apple Notes app.`,
      );
    }

    const cleanedHtml = stripLargeImagesFromHtml(htmlContent);

    const { NodeHtmlMarkdown } = await import("node-html-markdown");

    const nodeToMarkdown = new NodeHtmlMarkdown({
      keepDataImages: true,
      maxConsecutiveNewlines: 3,
    });

    const markdown = nodeToMarkdown.translate(cleanedHtml);

    const processedMarkdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+temp-images[^)]+)\)/g, (match, alt, imagePath) => {
      let p = imagePath.replace(/^<|>$/g, "");

      if (!/^file:\/\//i.test(p)) {
        p = `file://${encodeURI(p)}`;
      }

      return `![${alt}](${p})`;
    });

    return processedMarkdown;
  } catch (err) {
    if (err instanceof Error && err.message.includes("heap out of memory")) {
      throw new Error("Content exceeds memory limits. Please open this note in the Apple Notes app.");
    }
    throw err;
  }
}
