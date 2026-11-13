import { Toast, environment, getPreferenceValues, openExtensionPreferences, showToast } from "@raycast/api";
import { runJxa } from "run-jxa";
import { imageSize } from "image-size";

import { basename, extname, join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";

import { Pocket, Card, Preferences, WalletStatus } from "./types";
import { isWindows } from "./platform";
import { purgePdfThumbnails } from "./lib/pdfThumbnail";
import { loadTooltipFields } from "./lib/tooltipFields";

const execFileAsync = promisify(execFile);

const PREVIEW_DIR = join(environment.supportPath, ".previews");

// Windows renders PNG, macOS gets a TIFF straight out of AVFoundation.
const PREVIEW_EXT = isWindows ? ".png" : ".tiff";

// Define supported file extensions
const videoExts = [".mov", ".mp4", ".m4v", ".mts", ".3gp", ".m2ts", ".m2v", ".mpeg", ".mpg", ".mts", ".vob"];
const imageExts = [
  ".png",
  ".jpg",
  ".jpeg",
  ".avif",
  ".bmp",
  ".dds",
  ".exr",
  ".gif",
  ".hdr",
  ".ico",
  ".jpe",
  ".pbm",
  ".pfm",
  ".pgm",
  ".pict",
  ".ppm",
  ".psd",
  ".sgi",
  ".svg",
  ".tga",
  ".tiff",
  ".webp",
  ".cr2",
  ".dng",
  ".heic",
  ".heif",
  ".jp2",
  ".nef",
  ".orf",
  ".raf",
  ".rw2",
];

/** Thrown when the Wallet directory exists but its contents can't be listed (e.g. permissions). */
export class WalletUnreadableError extends Error {}

export type ResolvedWallet = {
  status: WalletStatus;
  path: string;
  walletDirectory: string;
};

/**
 * Re-reads the Wallet directory preference and stats it. Call this from render and from
 * fetch/revalidate — never cache the result at module load, or a Change Wallet Directory
 * round-trip stays stuck on the previous missing/not-found state until relaunch.
 */
export function resolveWallet(): ResolvedWallet {
  const { walletDirectory } = getPreferenceValues<Preferences>();
  if (!walletDirectory) {
    return { status: "missing", path: environment.supportPath, walletDirectory: "" };
  }

  try {
    // statSync follows symlinks, so a linked Wallet directory is accepted too.
    if (fs.statSync(walletDirectory).isDirectory()) {
      return { status: "ready", path: walletDirectory, walletDirectory };
    }
    return { status: "not-found", path: environment.supportPath, walletDirectory };
  } catch {
    // Moved, renamed, or on an unmounted drive.
    return { status: "not-found", path: environment.supportPath, walletDirectory };
  }
}

export async function fetchFiles(walletDirectory?: string): Promise<Pocket[]> {
  // `walletDirectory` is a usePromise dependency so a preference change re-runs the scan.
  // Always re-read via resolveWallet so Retry recovers even when this argument is stale.
  void walletDirectory;

  const { status, path } = resolveWallet();
  if (status !== "ready") return [];

  const pockets: Pocket[] = [];

  // Guards against symlink cycles, which recursion into linked directories makes reachable.
  const visitedDirectories = new Set<string>();
  const wantsDimensions = (await loadTooltipFields()).includes("dimensions");

  await collectPockets(path, undefined, pockets, visitedDirectories, wantsDimensions, true);

  // The Wallet root's own Cards come first, then Pockets by path so parents precede children.
  return pockets.sort((a, b) => {
    if (a.name === undefined) return -1;
    if (b.name === undefined) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * A Pocket is any directory holding at least one Card. Pockets nest to any depth and are named
 * by their path relative to the Wallet root ("memes/reactions"), which keeps every level
 * addressable in the Pocket filter and as a grid section.
 */
async function collectPockets(
  dir: string,
  pocketName: string | undefined,
  pockets: Pocket[],
  visitedDirectories: Set<string>,
  wantsDimensions: boolean,
  isRoot = false,
): Promise<void> {
  let realPath: string;
  try {
    realPath = fs.realpathSync(dir);
  } catch {
    if (isRoot) throw new WalletUnreadableError(unreadableWalletMessage(dir));
    reportUnreadable(dir, "directory");
    return;
  }

  if (visitedDirectories.has(realPath)) return;
  visitedDirectories.add(realPath);

  let entries: fs.Dirent[];
  try {
    fs.accessSync(dir, fs.constants.R_OK);
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    if (isRoot) throw new WalletUnreadableError(unreadableWalletMessage(dir));
    reportUnreadable(dir, "directory");
    return;
  }

  const visibleEntries = entries.filter((entry) => !entry.name.startsWith("."));

  const cards = await loadPocketCards(dir, visibleEntries, wantsDimensions);
  if (cards.length > 0) pockets.push({ name: pocketName, cards });

  for (const entry of visibleEntries) {
    const entryPath = join(dir, entry.name);

    let isDirectory = entry.isDirectory();
    if (entry.isSymbolicLink()) {
      try {
        isDirectory = fs.statSync(entryPath).isDirectory();
      } catch {
        continue;
      }
    }
    if (!isDirectory) continue;

    await collectPockets(
      entryPath,
      pocketName ? `${pocketName}/${entry.name}` : entry.name,
      pockets,
      visitedDirectories,
      wantsDimensions,
    );
  }
}

async function loadPocketCards(dir: string, entries: fs.Dirent[], wantsDimensions: boolean): Promise<Card[]> {
  const cardArr: Card[] = [];

  await Promise.all(
    entries.map(async (entry) => {
      const filePath = join(dir, entry.name);
      const rawExt = extname(filePath);
      const fileName = basename(filePath, rawExt);
      const fileExt = rawExt.toLowerCase();
      let fileStats;

      try {
        fileStats = fs.lstatSync(filePath);
        if (fileStats.isSymbolicLink()) fileStats = fs.statSync(filePath);
      } catch {
        // If we can't read the file stats, try to still include it if it's an image
        // If it's an image file, include it even if we can't get stats
        if (imageExts.includes(fileExt)) {
          const dimensions = wantsDimensions ? readDimensions(filePath) : undefined;
          cardArr.push(buildCard(fileName, filePath, fileExt, filePath, undefined, dimensions));
          return;
        }

        reportUnreadable(filePath, "file");
        return;
      }

      if (fileStats.isDirectory()) return;
      let previewPath: string | undefined = undefined;

      if (videoExts.includes(fileExt) && getPreferenceValues<Preferences>().videoPreviews) {
        previewPath = await videoPreviewFor(dir, entry.name, filePath);
      } else if (imageExts.includes(fileExt)) {
        previewPath = filePath;
      }

      // The video preview frame is captured at the source video's native resolution (no
      // scaling), so reading its header gives the video's own pixel dimensions for free.
      const dimensions = wantsDimensions ? readDimensions(previewPath) : undefined;

      // PDFs deliberately get no preview here: they are rendered asynchronously by
      // usePdfThumbnails so a slow PDFium pass never blocks the grid.
      cardArr.push(buildCard(fileName, filePath, fileExt, previewPath, fileStats, dimensions));
    }),
  );

  return cardArr;
}

function buildCard(
  name: string,
  path: string,
  fileExt: string,
  preview: string | undefined,
  stats?: fs.Stats,
  dimensions?: { width: number; height: number },
): Card {
  return {
    name,
    path,
    preview,
    extension: fileExt.replace(/^\./, ""),
    size: stats?.size ?? 0,
    mtimeMs: stats?.mtimeMs ?? 0,
    createdAtMs: stats?.birthtimeMs ?? 0,
    width: dimensions?.width,
    height: dimensions?.height,
  };
}

// 1 MB comfortably covers the header/metadata block of every format image-size supports,
// so reading it stays cheap even for large originals instead of loading the whole file.
const DIMENSION_READ_BYTES = 1024 * 1024;

/** Reads only the start of the file, so this stays cheap even for large images or video frames. */
function readDimensions(path: string | undefined): { width: number; height: number } | undefined {
  if (!path) return undefined;

  let fd: number | undefined;
  try {
    fd = fs.openSync(path, "r");
    const buffer = Buffer.alloc(Math.min(DIMENSION_READ_BYTES, fs.fstatSync(fd).size));
    fs.readSync(fd, buffer, 0, buffer.length, 0);

    const { width, height } = imageSize(buffer);
    return width && height ? { width, height } : undefined;
  } catch {
    // Unsupported or unrecognized format (e.g. many RAW extensions) — just skip dimensions.
    return undefined;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

async function videoPreviewFor(dir: string, item: string, filePath: string): Promise<string | undefined> {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  // Sanitize the path to create a valid filename.
  // Windows paths contain both separators and a drive colon, so strip all of them.
  const sanitizedPath = dir.replace(/[\\/:]/g, "-").replace(/[^a-zA-Z0-9\-_]/g, "_");
  const sanitizedItem = item.replace(/[^a-zA-Z0-9\-_.]/g, "_");
  const previewPath = join(PREVIEW_DIR, `${sanitizedPath}-${sanitizedItem}${PREVIEW_EXT}`);

  if (fs.existsSync(previewPath)) return previewPath;
  return (await generateVideoPreview(filePath, previewPath)) ? previewPath : undefined;
}

function unreadableWalletMessage(dir: string): string {
  return `"${dir}" could not be read. It may be protected, or on a drive that isn't currently accessible.`;
}

function reportUnreadable(path: string, kind: "file" | "directory") {
  // Photos is protected by default, and is a frequent appearance in my extension error emails.
  // I figure it makes sense to explicitly ignore it.
  if (path.endsWith(".photoslibrary")) return;
  if (getPreferenceValues<Preferences>().suppressReadErrors) return;

  showToast({
    style: Toast.Style.Failure,
    title: `${path} could not be read`,
    message:
      kind === "directory"
        ? "File/directory may contain special characters, or protect read access. Suppress this error in extension preferences."
        : "File may contain special characters. Suppress this error in extension preferences.",
    primaryAction: {
      title: "Change Wallet Directory",
      onAction: () => openExtensionPreferences(),
    },
  });
}

export function purgePreviews() {
  fs.rmSync(PREVIEW_DIR, { recursive: true, force: true });
  purgePdfThumbnails();
  ffmpegMissingReported = false;
}

async function generateVideoPreview(inputPath: string, outputPath: string): Promise<string | undefined> {
  const previewPath = isWindows
    ? await generateVideoPreviewWithFfmpeg(inputPath, outputPath)
    : await generateVideoPreviewWithJxa(inputPath, outputPath);

  return previewPath?.toString();
}

// ffmpeg is not bundled with Raycast, so a missing binary is an expected outcome
// rather than an error. Warn once per Wallet scan and fall back to the file-type icon.
let ffmpegMissingReported = false;

async function generateVideoPreviewWithFfmpeg(inputPath: string, outputPath: string): Promise<string | undefined> {
  try {
    await execFileAsync(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-y", "-ss", "0", "-i", inputPath, "-frames:v", "1", outputPath],
      { windowsHide: true },
    );
  } catch (e) {
    const isMissingBinary = (e as NodeJS.ErrnoException)?.code === "ENOENT";

    if (isMissingBinary && !ffmpegMissingReported) {
      ffmpegMissingReported = true;
      showToast({
        style: Toast.Style.Failure,
        title: "ffmpeg not found",
        message:
          "Video previews on Windows require ffmpeg on your PATH. Install it, or turn off 'Generate Video Previews' in extension preferences.",
      });
    } else if (!isMissingBinary) {
      showToast({
        style: Toast.Style.Failure,
        title: `Could not generate a preview for ${basename(inputPath)}`,
      });
    }

    return undefined;
  }

  return fs.existsSync(outputPath) ? outputPath : undefined;
}

async function generateVideoPreviewWithJxa(inputPath: string, outputPath: string): Promise<string | undefined> {
  const previewPath = await runJxa(
    `
      ObjC.import("objc");
      ObjC.import("CoreMedia");
      ObjC.import("Foundation");
      ObjC.import("AVFoundation");
      ObjC.import("CoreGraphics");
      ObjC.import("CoreImage");
      ObjC.import("AppKit");

      const [inputPath, outputPath] = args;

      // Load the video file
      const assetURL = $.NSURL.fileURLWithPath(
        inputPath
      );

      const asset = $.objc_getClass("AVAsset").assetWithURL(assetURL);

      // Ensure the video has a video track
      if (asset.tracksWithMediaType($.AVMediaTypeVideo).count == 0) {
        return undefined;
      }

      const frameCount = 15; // The number of frames to analyze

      // Set up the AVAssetReader for reading the video frames into pixel buffers
      const reader = $.objc_getClass("AVAssetReader").alloc.initWithAssetError(
        asset,
        null
      );
      const track = asset.tracksWithMediaType($.AVMediaTypeVideo).objectAtIndex(0);
      const settings = $.NSDictionary.dictionaryWithObjectForKey(
        "420v",
        "PixelFormatType"
      );
      readerOutput = $.objc_getClass(
        "AVAssetReaderTrackOutput"
      ).alloc.initWithTrackOutputSettings(track, settings);
      reader.addOutput(readerOutput);
      reader.startReading;

      // Read the video frames into pixel buffers
      let buf = readerOutput.copyNextSampleBuffer;
      if (reader.status != $.AVAssetReaderStatusFailed) {
        const imageBufferRef = ObjC.castRefToObject(
          $.CMSampleBufferGetImageBuffer(buf)
        );
      const CIImage = $.CIImage.imageWithCVPixelBuffer(imageBufferRef)
      const imageRep = $.NSBitmapImageRep.alloc.initWithCIImage(CIImage)
      const imageData = imageRep.TIFFRepresentation
      imageData.writeToFileAtomically(outputPath, true)

      return outputPath
      }
      `,
    [inputPath, outputPath],
  );

  return previewPath?.toString();
}
