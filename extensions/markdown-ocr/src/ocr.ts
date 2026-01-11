import {
  Clipboard,
  LocalStorage,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api";
import { Mistral } from "@mistralai/mistralai";
import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { constants as fsConstants, promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

type Preferences = {
  inputMode?: "screenshot" | "clipboard";
  mistralApiKey: string;
  mistralOcrModel?: string;
  copyResultToClipboard?: boolean;
  pasteResultAfterCopy?: boolean;
  playSuccessSound?: boolean;
};

type ImageData = {
  base64: string;
  mime: string;
};

const execFileAsync = promisify(execFile);

const mimeByExtension: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

function guessMimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return mimeByExtension[ext] ?? "application/octet-stream";
}

function extractImageDataUrl(input: string): ImageData | null {
  const match = input.match(/data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function macosPrivacyUrl(pane: "Privacy_ScreenCapture" | "Privacy_Accessibility"): string {
  return `x-apple.systempreferences:com.apple.preference.security?${pane}`;
}

async function playSuccessSound(): Promise<void> {
  if (process.platform !== "darwin") return;

  const soundCandidates = ["/System/Library/Sounds/Glass.aiff", "/System/Library/Sounds/Ping.aiff"];
  const soundPath = await (async () => {
    for (const candidate of soundCandidates) {
      try {
        await fs.access(candidate, fsConstants.R_OK);
        return candidate;
      } catch {
        // keep trying
      }
    }
    return null;
  })();
  if (!soundPath) return;

  try {
    await execFileAsync("/usr/bin/afplay", [soundPath]);
  } catch {
    // ignore sound failures
  }
}

async function ensureScreenRecordingPermissionOrThrow(screencapturePath: string): Promise<void> {
  if (process.platform !== "darwin") return;

  const tmpFilePath = path.join(os.tmpdir(), `raycast-markdown-ocr-permission-check-${randomUUID()}.png`);
  try {
    await execFileAsync(screencapturePath, ["-x", "-t", "png", tmpFilePath]);
    await fs.rm(tmpFilePath, { force: true }).catch(() => undefined);
  } catch (error) {
    const stderr =
      error &&
      typeof error === "object" &&
      "stderr" in error &&
      typeof (error as { stderr?: unknown }).stderr === "string"
        ? (error as { stderr: string }).stderr || ""
        : "";
    const combined = `${stderr} ${error instanceof Error ? error.message : String(error)}`.toLowerCase();
    if (
      combined.includes("not permitted") ||
      combined.includes("screen recording") ||
      combined.includes("screen capture failed")
    ) {
      throw new Error(
        "Raycast needs Screen Recording permission to capture screenshots (System Settings → Privacy & Security → Screen Recording).",
      );
    }
    throw error;
  } finally {
    await fs.rm(tmpFilePath, { force: true }).catch(() => undefined);
  }
}

async function maybeShowPermissionsHint(preferences: Preferences): Promise<void> {
  if (process.platform !== "darwin") return;

  const inputMode = preferences.inputMode ?? "screenshot";
  const key = `didShowPermissionsHint:${inputMode}:${preferences.pasteResultAfterCopy ? "paste" : "no-paste"}`;
  const already = await LocalStorage.getItem<string>(key);
  if (already) return;

  const isScreenshot = inputMode === "screenshot";
  const needsAccessibility = Boolean(preferences.pasteResultAfterCopy);

  const hints: string[] = [];
  if (isScreenshot) hints.push("Screen Recording");
  if (needsAccessibility) hints.push("Accessibility (for paste)");

  if (hints.length === 0) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Setup (macOS permissions)",
    message: `May require: ${hints.join(", ")}.`,
    primaryAction: isScreenshot
      ? {
          title: "Open Screen Recording Settings",
          onAction: () => {
            void open(macosPrivacyUrl("Privacy_ScreenCapture"));
          },
        }
      : needsAccessibility
        ? {
            title: "Open Accessibility Settings",
            onAction: () => {
              void open(macosPrivacyUrl("Privacy_Accessibility"));
            },
          }
        : undefined,
    secondaryAction: needsAccessibility
      ? {
          title: "Open Accessibility Settings",
          onAction: () => {
            void open(macosPrivacyUrl("Privacy_Accessibility"));
          },
        }
      : undefined,
  });

  await LocalStorage.setItem(key, "1");

  // Don't keep this toast around forever; it's just a first-run hint.
  void (async () => {
    await delay(4500);
    await toast.hide();
  })();
}

function detectImageMimeFromBuffer(buffer: Buffer): string | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // GIF: "GIF87a" or "GIF89a"
  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString("ascii");
    if (header === "GIF87a" || header === "GIF89a") return "image/gif";
  }
  // WEBP: "RIFF" .... "WEBP"
  if (buffer.length >= 12) {
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }
  // BMP: "BM"
  if (buffer.length >= 2 && buffer.subarray(0, 2).toString("ascii") === "BM") {
    return "image/bmp";
  }
  // TIFF: "II*\0" or "MM\0*"
  if (buffer.length >= 4) {
    const tiff = buffer.subarray(0, 4);
    if (tiff.equals(Buffer.from([0x49, 0x49, 0x2a, 0x00])) || tiff.equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a]))) {
      return "image/tiff";
    }
  }
  return null;
}

async function readImageDataFromFile(filePath: string): Promise<ImageData> {
  const buffer = await fs.readFile(filePath);
  const guessed = guessMimeFromPath(filePath);
  const detected = detectImageMimeFromBuffer(buffer);
  const mime = detected ?? (guessed.startsWith("image/") ? guessed : null);
  if (!mime) {
    throw new Error("Clipboard file is not a supported image format.");
  }
  return { base64: buffer.toString("base64"), mime };
}

async function tryReadImageDataFromFile(filePath: string): Promise<ImageData | null> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return null;
    return await readImageDataFromFile(filePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "ENOENT") {
      return null;
    }
    return null;
  }
}

async function readPngFromMacClipboardViaAppleScript(): Promise<ImageData | null> {
  if (process.platform !== "darwin") return null;

  const tmpFilePath = path.join(os.tmpdir(), `raycast-markdown-ocr-${randomUUID()}.png`);
  try {
    await execFileAsync("osascript", [
      "-e",
      `set outPath to POSIX file "${tmpFilePath.replace(/"/g, '\\"')}"`,
      "-e",
      `set imageData to the clipboard as «class PNGf»`,
      "-e",
      `set outFile to open for access outPath with write permission`,
      "-e",
      `set eof of outFile to 0`,
      "-e",
      `write imageData to outFile`,
      "-e",
      `close access outFile`,
    ]);

    return await readImageDataFromFile(tmpFilePath);
  } catch {
    return null;
  } finally {
    await fs.rm(tmpFilePath, { force: true }).catch(() => undefined);
  }
}

async function readClipboardImage(): Promise<ImageData | null> {
  const { file, html, text } = await Clipboard.read({ offset: 0 });

  if (file) {
    const fromFile = await tryReadImageDataFromFile(file);
    if (fromFile) return fromFile;
  }

  if (html) {
    const dataUrl = extractImageDataUrl(html);
    if (dataUrl) return dataUrl;

    const srcMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (srcMatch?.[1]) {
      const src = srcMatch[1];
      const srcDataUrl = extractImageDataUrl(src);
      if (srcDataUrl) return srcDataUrl;
      if (src.startsWith("file://")) {
        const filePath = decodeURIComponent(src.replace("file://", ""));
        const fromFile = await tryReadImageDataFromFile(filePath);
        if (fromFile) return fromFile;
      }
    }
  }

  const textDataUrl = text ? extractImageDataUrl(text) : null;
  if (textDataUrl) return textDataUrl;

  return await readPngFromMacClipboardViaAppleScript();
}

async function captureScreenshotImage(): Promise<ImageData | null> {
  if (process.platform !== "darwin") {
    return null;
  }

  const screencapturePath = await (async () => {
    for (const candidate of ["/usr/sbin/screencapture", "/usr/bin/screencapture"]) {
      try {
        await fs.access(candidate, fsConstants.X_OK);
        return candidate;
      } catch {
        // keep trying
      }
    }
    return "screencapture";
  })();

  const didCheckPermission = await LocalStorage.getItem<string>("didCheckScreenRecordingPermission");
  if (!didCheckPermission) {
    await ensureScreenRecordingPermissionOrThrow(screencapturePath);
    await LocalStorage.setItem("didCheckScreenRecordingPermission", "1");
  }

  const tmpFilePath = path.join(os.tmpdir(), `raycast-markdown-ocr-screenshot-${randomUUID()}.png`);
  try {
    await execFileAsync(screencapturePath, ["-i", "-t", "png", tmpFilePath]);
    return await readImageDataFromFile(tmpFilePath);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: unknown }).code : undefined;
    const stderr =
      error &&
      typeof error === "object" &&
      "stderr" in error &&
      typeof (error as { stderr?: unknown }).stderr === "string"
        ? (error as { stderr: string }).stderr || ""
        : "";
    const combined = `${stderr} ${error instanceof Error ? error.message : String(error)}`.toLowerCase();

    // `screencapture -i`: hitting ESC typically cancels with exit code 1.
    if (code === 1 && combined.includes("no image files were captured")) {
      return null;
    }

    // When Raycast doesn't have Screen Recording permission, `screencapture` can fail.
    if (
      code === 1 &&
      (combined.includes("not permitted") ||
        combined.includes("screen recording") ||
        combined.includes("screen capture failed"))
    ) {
      throw new Error(
        "Raycast needs Screen Recording permission to capture screenshots (System Settings → Privacy & Security → Screen Recording).",
      );
    }

    // Raycast's PATH might not include /usr/sbin, so provide a helpful error.
    if (code === "ENOENT") {
      throw new Error(
        "Could not run macOS screencapture (not found). Make sure /usr/sbin/screencapture exists and is executable.",
      );
    }
    throw error;
  } finally {
    await fs.rm(tmpFilePath, { force: true }).catch(() => undefined);
  }
}

async function getInputImage(preferences: Preferences): Promise<ImageData | null> {
  const inputMode = preferences.inputMode ?? "screenshot";

  if (inputMode === "screenshot") {
    // Close Raycast before starting the interactive screenshot so it doesn't appear in the capture.
    await closeMainWindow({ clearRootSearch: true });
    await delay(150);
    const image = await captureScreenshotImage();
    return image;
  }

  return await readClipboardImage();
}

export default async function command() {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.mistralApiKey?.trim();

  if (!apiKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Missing Mistral API Key",
      message: "Set it in the extension preferences.",
    });
    await openExtensionPreferences();
    return;
  }

  await maybeShowPermissionsHint(preferences);

  const toast = await showToast({ style: Toast.Style.Animated, title: "Running OCR…" });

  try {
    const inputMode = preferences.inputMode ?? "screenshot";
    const image = await getInputImage(preferences);
    if (!image) {
      toast.style = Toast.Style.Failure;
      toast.title = inputMode === "screenshot" ? "Screenshot cancelled" : "No image in clipboard";
      toast.message =
        inputMode === "screenshot"
          ? "Run the command again to capture."
          : "Copy an image first, then run the command again.";
      if (inputMode === "screenshot" && process.platform !== "darwin") {
        toast.title = "Screenshot not supported";
        toast.message = "Switch Input to Clipboard in extension preferences.";
        await openExtensionPreferences();
      }
      return;
    }

    const model = preferences.mistralOcrModel?.trim() || "mistral-ocr-latest";
    const client = new Mistral({ apiKey });

    const ocrResponse = await client.ocr.process({
      model,
      document: {
        type: "image_url",
        imageUrl: `data:${image.mime};base64,${image.base64}`,
      },
      includeImageBase64: false,
    });

    const markdown = ocrResponse.pages
      .map((p) => p.markdown)
      .join("\n\n")
      .trim();
    if (!markdown) {
      toast.style = Toast.Style.Failure;
      toast.title = "OCR returned empty text";
      return;
    }

    if (preferences.copyResultToClipboard ?? true) {
      await Clipboard.copy(markdown);
    }
    if (preferences.pasteResultAfterCopy) {
      try {
        await Clipboard.paste(markdown);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Paste failed",
          message: "Raycast may need Accessibility permission to paste into other apps.",
          primaryAction: {
            title: "Open Accessibility Settings",
            onAction: () => {
              void open(macosPrivacyUrl("Privacy_Accessibility"));
            },
          },
        });
      }
    }

    toast.style = Toast.Style.Success;
    toast.title = "Markdown extracted";
    toast.message = (preferences.copyResultToClipboard ?? true) ? "Copied to clipboard." : undefined;
    if (preferences.playSuccessSound ?? true) {
      await playSuccessSound();
    }
    await showHUD("Markdown OCR done");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "OCR failed";
    const message = error instanceof Error ? error.message : String(error);
    toast.message = message;

    if (process.platform === "darwin" && message.toLowerCase().includes("screen recording")) {
      toast.primaryAction = {
        title: "Open Screen Recording Settings",
        onAction: () => {
          void open(macosPrivacyUrl("Privacy_ScreenCapture"));
        },
      };
    }
  }
}
