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
  // Create temp directory for extracted images if it doesn't exist
  const tempDir = path.join(environment.supportPath, "temp-images");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  let imageCounter = 0;

  // Match img tags with data URLs and extract the base64 data
  const imgDataUrlPattern = /<img([^>]*)src=["']data:image\/([^;]+);base64,([^"']+)["']([^>]*)>/gi;

  const processedHtml = htmlContent.replace(imgDataUrlPattern, (match, beforeSrc, imageType, base64Data, afterSrc) => {
    // Calculate approximate size in MB (base64 is ~33% larger than original)
    const base64Length = base64Data.length;
    const approximateSizeMB = (base64Length * 0.75) / (1024 * 1024);

    // Keep small images inline (< 1MB actual image size, ~1.3MB base64)
    const SMALL_IMAGE_THRESHOLD_MB = 1;
    if (approximateSizeMB < SMALL_IMAGE_THRESHOLD_MB) {
      return match; // Keep the original image tag with base64
    }

    // For images >= 1MB, extract to temp file
    try {
      imageCounter++;
      const timestamp = Date.now();
      const filename = `note-image-${timestamp}-${imageCounter}.${imageType.toLowerCase()}`;
      const tempFilePath = path.join(tempDir, filename);

      // Decode base64 and write to file
      const imageBuffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(tempFilePath, new Uint8Array(imageBuffer));

      // Return img tag with file path - preserve any other attributes
      return `<img${beforeSrc} src="${tempFilePath}"${afterSrc}>`;
    } catch (error) {
      // If extraction fails, show placeholder
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
 * Removes images older than 24 hours
 */
export function cleanupTempImages(): void {
  try {
    const tempDir = path.join(environment.supportPath, "temp-images");
    if (!fs.existsSync(tempDir)) {
      return;
    }

    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    const files = fs.readdirSync(tempDir);
    files.forEach((file: string) => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      // Remove files older than 24 hours
      if (age > maxAge) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    // Silently fail - cleanup is not critical
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
    // Cleanup old temp images periodically
    cleanupTempImages();

    // Check if content is excessively large (rough estimate: >50MB could cause issues)
    const contentSizeInMB = new TextEncoder().encode(htmlContent).length / (1024 * 1024);
    if (contentSizeInMB > 50) {
      throw new Error(
        `Note content is too large (${contentSizeInMB.toFixed(1)}MB). Please open this note in the Apple Notes app.`,
      );
    }

    // Process images: keep small ones inline, extract larger ones to temp files
    const cleanedHtml = stripLargeImagesFromHtml(htmlContent);

    // Use dynamic import to avoid loading the module until needed
    const { NodeHtmlMarkdown } = await import("node-html-markdown");

    // keepDataImages: true is safe because we've already processed large images
    // Small images (< 1MB) will be preserved inline, larger ones are now file paths
    const nodeToMarkdown = new NodeHtmlMarkdown({
      keepDataImages: true,
      // Additional options to reduce memory usage
      maxConsecutiveNewlines: 3,
    });

    const markdown = nodeToMarkdown.translate(cleanedHtml);

    // replace the post-process block in convertHtmlToMarkdownSafely
    const processedMarkdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+temp-images[^)]+)\)/g, (match, alt, imagePath) => {
      // strip surrounding <> if present (some converters wrap paths)
      let p = imagePath.replace(/^<|>$/g, "");

      // avoid double file://
      if (!/^file:\/\//i.test(p)) {
        // encode spaces and special chars safely
        p = `file://${encodeURI(p)}`;
      }

      // return standard Markdown image syntax so renderers show the image
      return `![${alt}](${p})`;
    });

    return processedMarkdown;

    return processedMarkdown;
  } catch (err) {
    if (err instanceof Error && err.message.includes("heap out of memory")) {
      throw new Error("Content exceeds memory limits. Please open this note in the Apple Notes app.");
    }
    throw err;
  }
}
