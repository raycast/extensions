import { getDetectedFileInfo } from "./detector";
import { compressImage } from "./image";
import { compressVideo } from "./video";
import { compressAudio } from "./audio";
import { compressPdf } from "./pdf";
import { CompressionOptions, CompressionResult } from "./types";

export * from "./types";
export * from "./detector";
export * from "./image";
export * from "./video";
export * from "./audio";
export * from "./pdf";

/**
 * Main compression dispatcher that routes to the appropriate engine
 */
export async function compressFile(options: CompressionOptions): Promise<CompressionResult> {
  const fileInfo = getDetectedFileInfo(options.inputPath);
  if (!fileInfo) {
    throw new Error(`File not found or inaccessible: ${options.inputPath}`);
  }

  const category = fileInfo.category;

  switch (category) {
    case "image":
      return await compressImage(options);
    case "video":
      return await compressVideo(options);
    case "audio":
      return await compressAudio(options);
    case "pdf":
      return await compressPdf(options);
    case "archive":
    case "unknown":
    default:
      throw new Error(
        `Unsupported format (${fileInfo.extension || "unknown"}). WayCompress currently supports Video, Image, Audio, and PDF files.`
      );
  }
}
