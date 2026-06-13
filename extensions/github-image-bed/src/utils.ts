import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawn } from "child_process";
import dayjs from "dayjs";
import { runAppleScript } from "@raycast/utils";
import { Clipboard, LocalStorage } from "@raycast/api";
import { Octokit } from "@octokit/core";
import { fileTypeFromBuffer } from "file-type";

// ─── Shared Interfaces ────────────────────────────────────────────────

export interface Preferences {
  githubToken: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  email: string;
  cdnUrl: string;
  defaultFormat: "markdown" | "url" | "html";
  filenameTemplate: string;
}

export interface Arguments {
  imageName?: string;
}

export interface UploadResult {
  status: "loading" | "success" | "error" | "cancelled";
  url: string;
  errorMessage: string;
}

// ─── Filename Generation ──────────────────────────────────────────────

/**
 * Generate filename from template with placeholder replacement
 * Placeholders: {yyyy}, {yy}, {MM}, {dd}, {hh}, {mm}, {ss}, {sss}, {name}, {random}
 */
export function generateFilenameFromTemplate(
  template: string,
  ext: string,
  name: string = "",
): string {
  const now = dayjs();
  const random = Math.random().toString(36).substring(2, 8);

  // If template is empty or undefined, use default format
  if (!template || !template.trim()) {
    const timestamp = now.format("YYYY-MM-DD_HHmmss");
    return name
      ? `${timestamp}_${name}.${ext}`
      : `${timestamp}_${random}.${ext}`;
  }

  let filename = template
    .replace(/{yyyy}/g, now.format("YYYY"))
    .replace(/{yy}/g, now.format("YY"))
    .replace(/{MM}/g, now.format("MM"))
    .replace(/{dd}/g, now.format("DD"))
    .replace(/{hh}/g, now.format("HH"))
    .replace(/{mm}/g, now.format("mm"))
    .replace(/{ss}/g, now.format("ss"))
    .replace(/{sss}/g, now.format("SSS"))
    .replace(/{name}/g, name || "")
    .replace(/{random}/g, random);

  // Clean up: remove characters unsafe for filenames/GitHub paths
  filename = filename.replace(/[<>:"/\\|?*\s]/g, "_");

  // Remove trailing/leading underscores/hyphens and consecutive separators
  filename = filename
    .replace(/[-_]+$/, "")
    .replace(/^[-_]+/, "")
    .replace(/[-_]{2,}/g, "_");

  // If filename is empty after processing, use default
  if (!filename.trim()) {
    filename = `${now.format("YYYY-MM-DD_HHmmss")}_${random}`;
  }

  return `${filename}.${ext}`;
}

// ─── Path & URL Helpers ───────────────────────────────────────────────

/**
 * Format path to ensure it ends with /
 */
export function normalizePath(p: string): string {
  if (!p) return "";
  let normalized = p;
  if (normalized.startsWith("/")) {
    normalized = normalized.substring(1);
  }
  if (normalized && !normalized.endsWith("/")) {
    normalized += "/";
  }
  return normalized;
}

/**
 * Parse comma-separated path list from preferences.
 * Returns array of normalized paths.
 */
export function parsePathList(pathValue: string): string[] {
  if (!pathValue || !pathValue.trim()) return [];
  return pathValue
    .split(",")
    .map((s) => normalizePath(s.trim()))
    .filter((s) => s.length > 0);
}

/**
 * Get the currently active upload path.
 * Reads from LocalStorage first; falls back to first path from preferences.
 */
export async function getActivePath(preferences: Preferences): Promise<string> {
  const stored = await LocalStorage.getItem<string>("activePath");
  if (stored) return stored;
  const paths = parsePathList(preferences.path);
  return paths.length > 0 ? paths[0] : normalizePath(preferences.path);
}

/**
 * Set the currently active upload path in LocalStorage
 */
export async function setActivePath(path: string): Promise<void> {
  await LocalStorage.setItem("activePath", path);
}

/**
 * Build CDN URL from template
 */
export function buildCdnUrl(
  template: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
): string {
  return template
    .replace("{owner}", owner)
    .replace("{repo}", repo)
    .replace("{branch}", branch)
    .replace("{path}", filePath);
}

/**
 * Format URL based on selected format
 */
export function formatUrl(
  url: string,
  format: "markdown" | "url" | "html",
): string {
  switch (format) {
    case "markdown":
      return `![](${url})`;
    case "html":
      return `<img src="${url}" alt="" />`;
    case "url":
    default:
      return url;
  }
}

// ─── Clipboard ────────────────────────────────────────────────────────

/**
 * Saves the clipboard image to a temporary file using AppleScript (macOS)
 */
export async function saveClipboardImageToFile(
  filepath: string,
): Promise<void> {
  const script = `
    use framework "Foundation"
    use framework "AppKit"

    property NSString : a reference to current application's NSString
    property NSData : a reference to current application's NSData
    property NSPasteboard : a reference to current application's NSPasteboard
    property NSBitmapImageRep : a reference to current application's NSBitmapImageRep
    property NSImage : a reference to current application's NSImage

    on run argv
      set targetPath to item 1 of argv
      set pb to NSPasteboard's generalPasteboard()

      if (pb's canReadItemWithDataConformingToTypes:{"public.image"}) then
        set imageClasses to {current application's NSImage}
        set imageObjects to pb's readObjectsForClasses:imageClasses options:(missing value)

        if (count of imageObjects) > 0 then
          set theImage to item 1 of imageObjects
          set tiffData to theImage's TIFFRepresentation()

          if tiffData is not missing value then
            set bitmapRep to NSBitmapImageRep's imageRepWithData:tiffData
            set pngData to bitmapRep's representationUsingType:(current application's NSBitmapImageFileTypePNG) properties:(missing value)

            if pngData is not missing value then
              pngData's writeToFile:targetPath atomically:true
              return "ok"
            end if
          end if
        end if
      end if

      return "error"
    end run
  `;

  try {
    const result = await runAppleScript(script, [filepath]);
    if (result !== "ok") {
      throw new Error("No image found in clipboard");
    }
  } catch (error) {
    if (String(error).includes("No image found")) {
      throw error;
    }
    throw new Error(`Failed to save clipboard image: ${error}`);
  }
}

/**
 * Detect image type from buffer using file-type
 */
export async function detectImageType(
  buffer: Buffer,
): Promise<{ ext: string; mime: string } | null> {
  const uint8Array = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const type = await fileTypeFromBuffer(uint8Array);
  if (type && type.mime.startsWith("image")) {
    return { ext: type.ext, mime: type.mime };
  }
  return null;
}

/**
 * Get image from clipboard — supports both copied files and screenshot images
 */
export async function getImageFromClipboard(): Promise<{
  buffer: Buffer;
  ext: string;
} | null> {
  const data = await Clipboard.read();

  if (data.file) {
    // Handle file copied from Finder
    const filepath = decodeURIComponent(data.file.replace(/^file:\/\//, ""));
    try {
      const buffer = fs.readFileSync(filepath);
      const imageType = await detectImageType(buffer);

      if (imageType) {
        return { buffer, ext: imageType.ext };
      }
      // File exists but is not an image — don't fall through to AppleScript
      return null;
    } catch (error) {
      console.error("Failed to read file:", error);
    }
  }

  // Fallback: Try to read image data directly using AppleScript (for screenshots)
  try {
    const tempFile = path.join(os.tmpdir(), `raycast-upload-${Date.now()}.png`);
    await saveClipboardImageToFile(tempFile);

    try {
      const buffer = fs.readFileSync(tempFile);
      return { buffer, ext: "png" };
    } finally {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    // Ignore error if no image in clipboard
    console.error("Failed to read clipboard image:", error);
  }

  return null;
}

// ─── Screenshot ───────────────────────────────────────────────────────

/**
 * Run macOS screencapture interactively and wait for result.
 * Returns the screenshot Buffer on success, or null if cancelled.
 *
 * Uses spawn with exit code detection:
 * - Exit code 0 + file exists = screenshot taken
 * - Exit code non-zero / no file = user cancelled (Escape) or error
 */
export function takeScreenshot(filePath: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // Ignore
      }
    };

    const proc = spawn("/usr/sbin/screencapture", ["-i", "-x", filePath]);

    proc.on("close", (code: number | null) => {
      if (resolved) return;
      resolved = true;

      if (code === 0 && fs.existsSync(filePath)) {
        try {
          const buffer = fs.readFileSync(filePath);
          if (buffer.length > 0) {
            // Clean up temp file after successful read
            try {
              fs.unlinkSync(filePath);
            } catch {
              // Ignore
            }
            resolve(buffer);
            return;
          }
        } catch {
          // Read failed, fall through to cancel
        }
      }

      cleanup();
      resolve(null);
    });

    proc.on("error", () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(null);
    });
  });
}

// ─── Upload ───────────────────────────────────────────────────────────

/**
 * Upload image buffer to GitHub
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  ext: string,
  preferences: Preferences,
  imageName: string = "",
): Promise<string> {
  const content = buffer.toString("base64");
  const p = normalizePath(await getActivePath(preferences));
  const filename = generateFilenameFromTemplate(
    preferences.filenameTemplate,
    ext,
    imageName,
  );
  const filePath = `${p}${filename}`;

  const octokit = new Octokit({ auth: preferences.githubToken });

  await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
    owner: preferences.owner,
    repo: preferences.repo,
    path: filePath,
    message: `Upload image: ${filename}`,
    committer: {
      name: preferences.owner,
      email: preferences.email,
    },
    content: content,
    branch: preferences.branch || "main",
  });

  return buildCdnUrl(
    preferences.cdnUrl,
    preferences.owner,
    preferences.repo,
    preferences.branch || "main",
    filePath,
  );
}
