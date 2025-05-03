import { Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import { runJxa } from "run-jxa";

import { basename, extname } from "path";
import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync } from "fs";

import { Pocket, Card, Preferences } from "./types";

const PREVIEW_DIR = `${environment.supportPath}/.previews`;

export const walletPath = getWalletPath();
function getWalletPath() {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.walletDirectory) {
    const definedDir = lstatSync(preferences.walletDirectory);
    if (definedDir.isDirectory()) return preferences.walletDirectory;
  }
  return environment.supportPath;
}

export function fetchPocketNames(): string[] {
  return readdirSync(walletPath).filter((item) => {
    if (item.startsWith(".")) return;

    const filePath = `${walletPath}/${item}`;
    let fileStats;

    try {
      readdirSync(filePath);
      fileStats = lstatSync(filePath);
    } catch (e) {
      if (getPreferenceValues<Preferences>().suppressReadErrors) return;
      showToast({
        style: Toast.Style.Failure,
        title: `${filePath} could not be read`,
        message: "Suppress this error in extension preferences.",
      });

      return;
    }

    if (!fileStats.isDirectory()) return;

    return item;
  });
}

export async function fetchFiles(): Promise<Pocket[]> {
  const pocketArr: Pocket[] = [];

  const cards = await loadPocketCards(walletPath);
  if (cards.length > 0) pocketArr.push({ cards: cards });

  await Promise.all(
    fetchPocketNames().map(async (item) => {
      const cards = await loadPocketCards(`${walletPath}/${item}`);
      if (cards.length > 0) pocketArr.push({ name: item, cards: cards });
    })
  );

  return pocketArr;
}

async function loadPocketCards(dir: string): Promise<Card[]> {
  const cardArr: Card[] = [];
  const items = readdirSync(dir);

  await Promise.all(
    items.map(async (item) => {
      if (item.startsWith(".")) return;

      const filePath = `${dir}/${item}`;
      let fileStats;

      try {
        fileStats = lstatSync(filePath);
      } catch (e) {
        if (getPreferenceValues<Preferences>().suppressReadErrors) return;
        showToast({
          style: Toast.Style.Failure,
          title: `${filePath} could not be read`,
          message: "Suppress this error in extension preferences.",
        });

        return [];
      }

      const fileExt = extname(filePath).toLowerCase();
      const fileName = basename(filePath, fileExt);

      if (fileStats.isDirectory()) return;

      const videoExts = [".mov", ".mp4", ".m4v", ".mts", ".3gp", ".m2ts", ".m2v", ".mpeg", ".mpg", ".mts", ".vob"];
      const imageExts = [
        ".png",
        ".jpg",
        "jpeg",
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
      let previewPath: string | undefined = undefined;

      if (videoExts.includes(fileExt) && getPreferenceValues<Preferences>().videoPreviews) {
        if (!existsSync(PREVIEW_DIR)) mkdirSync(PREVIEW_DIR);
        previewPath = `${PREVIEW_DIR}/${dir.replaceAll("/", "-")}-${item}.tiff`;

        if (!existsSync(previewPath)) await generateVideoPreview(filePath, previewPath);
      } else if (imageExts.includes(fileExt)) {
        previewPath = filePath;
      }

      cardArr.push({ name: fileName, path: filePath, preview: previewPath });
    })
  );

  return cardArr.sort();
}

export function purgePreviews() {
  rmSync(PREVIEW_DIR, { recursive: true, force: true });
}

async function generateVideoPreview(inputPath: string, outputPath: string): Promise<string | undefined> {
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
    [inputPath, outputPath]
  );

  return previewPath?.toString();
}
