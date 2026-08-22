import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { CompressionOptions, CompressionResult } from "./types";
import { generateOutputPath, calculateCompressionRatio, formatBytes } from "../utils/format";
import { getAugmentedEnv } from "../utils/system";

interface ImageProbeResult {
  width: number;
  height: number;
}

export function probeImage(filePath: string): Promise<ImageProbeResult> {
  return new Promise((resolve) => {
    const ffprobe = spawn(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", filePath],
      { env: getAugmentedEnv() }
    );

    let stdout = "";
    ffprobe.stdout.on("data", (d) => {
      stdout += d.toString();
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(stdout);
          const stream = data.streams?.[0];
          if (stream && stream.width && stream.height) {
            return resolve({ width: stream.width, height: stream.height });
          }
        } catch {
          // Fallback
        }
      }
      resolve({ width: 1920, height: 1080 });
    });

    ffprobe.on("error", () => {
      resolve({ width: 1920, height: 1080 });
    });
  });
}

function runFfmpegImageEncode(
  inputPath: string,
  outputPath: string,
  scale: number,
  qualityPercent: number,
  outputExt: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const args = ["-y", "-i", inputPath];

    if (outputExt === "gif") {
      const scaleStr =
        scale < 0.99 ? `scale=trunc(iw*${scale.toFixed(3)}/2)*2:trunc(ih*${scale.toFixed(3)}/2)*2:flags=lanczos,` : "";
      args.push(
        "-vf",
        `fps=15,${scaleStr}split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`
      );
    } else {
      if (scale < 0.99) {
        args.push("-vf", `scale=trunc(iw*${scale.toFixed(3)}/2)*2:trunc(ih*${scale.toFixed(3)}/2)*2`);
      }

      if (outputExt === "jpg" || outputExt === "jpeg") {
        // ffmpeg jpeg quality: 2 (best) to 31 (lowest)
        const qv = Math.max(2, Math.min(31, Math.round(31 - (qualityPercent / 100) * 29)));
        args.push("-q:v", `${qv}`);
      } else if (outputExt === "webp") {
        args.push("-c:v", "libwebp", "-quality", `${qualityPercent}`);
      } else if (outputExt === "png") {
        args.push("-c:v", "png");
      }
    }

    args.push(outputPath);

    const proc = spawn("ffmpeg", args, { env: getAugmentedEnv() });
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

/**
 * Universal FFmpeg Image Compression Engine
 * Zero native C++ addon dependencies, 100% reliable on Windows, macOS & Linux.
 */
export async function compressImage(options: CompressionOptions): Promise<CompressionResult> {
  const { inputPath, targetSizeMB, qualityMode = "smart_auto", onProgress } = options;
  const targetBytes = Math.floor(targetSizeMB * 1024 * 1024);
  const originalStats = fs.statSync(inputPath);
  const originalSizeBytes = originalStats.size;

  onProgress?.(5, "Analyzing image metadata...");
  const probe = await probeImage(inputPath);
  const origExt = path.extname(inputPath).toLowerCase().replace(".", "");

  let outputExt = origExt === "jpeg" ? "jpg" : origExt;

  // If input is PNG/BMP and significant reduction is needed, use WebP or JPG for high visual quality
  if (outputExt === "png" || outputExt === "bmp") {
    if (qualityMode === "max_quality" || originalSizeBytes > targetBytes * 1.5) {
      outputExt = "jpg";
    }
  }

  const outputPath = options.outputPath || generateOutputPath(inputPath, outputExt);

  // If already under target size
  if (originalSizeBytes <= targetBytes) {
    fs.copyFileSync(inputPath, outputPath);
    return {
      success: true,
      inputPath,
      outputPath,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      targetSizeBytes: targetBytes,
      compressionRatio: 100,
      resolution: {
        originalWidth: probe.width,
        originalHeight: probe.height,
        newWidth: probe.width,
        newHeight: probe.height,
      },
      details: "File is already under target size.",
    };
  }

  onProgress?.(15, "Optimizing image quality...");

  const tempOut = path.join(os.tmpdir(), `waycompress_temp_${Date.now()}.${outputExt}`);
  let bestScale = 1.0;
  let bestQuality = 85;
  let successUnderTarget = false;

  const maxScales = qualityMode === "strict_resolution" ? 1 : 8;

  for (let sIdx = 0; sIdx < maxScales; sIdx++) {
    const scale = 1.0 - sIdx * 0.12; // 1.0, 0.88, 0.76, 0.64, 0.52, 0.40, 0.28, 0.16
    const currentW = Math.max(64, Math.round(probe.width * scale));
    const currentH = Math.max(64, Math.round(probe.height * scale));

    let lowQ = 15;
    let highQ = 95;

    for (let iter = 0; iter < 4; iter++) {
      const midQ = Math.round((lowQ + highQ) / 2);
      onProgress?.(Math.min(85, 20 + sIdx * 8 + iter * 2), `Optimizing: Quality ${midQ}% (${currentW}x${currentH})...`);

      const ok = await runFfmpegImageEncode(inputPath, tempOut, scale, midQ, outputExt);
      if (!ok || !fs.existsSync(tempOut)) continue;

      const size = fs.statSync(tempOut).size;
      if (size <= targetBytes) {
        successUnderTarget = true;
        bestScale = scale;
        bestQuality = midQ;
        fs.copyFileSync(tempOut, outputPath);
        lowQ = midQ + 1; // Try higher quality
      } else {
        highQ = midQ - 1; // Try lower quality
      }

      if (lowQ > highQ) break;
    }

    if (successUnderTarget) break;
  }

  // Fallback if extreme compression is required
  if (!successUnderTarget || !fs.existsSync(outputPath)) {
    if (qualityMode === "strict_resolution") {
      try {
        if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
      } catch {
        // Ignore
      }
      throw new Error(
        `Cannot compress image below ${targetSizeMB} MB in Strict Resolution mode without downscaling dimensions. Please choose 'Smart Balanced' mode or select a larger target size.`
      );
    }

    onProgress?.(88, "Applying aggressive optimization...");
    let aggressiveScale = 0.3;
    while (aggressiveScale >= 0.05) {
      await runFfmpegImageEncode(inputPath, tempOut, aggressiveScale, 25, outputExt);
      if (fs.existsSync(tempOut)) {
        const size = fs.statSync(tempOut).size;
        if (size <= targetBytes || aggressiveScale <= 0.08) {
          fs.copyFileSync(tempOut, outputPath);
          bestScale = aggressiveScale;
          bestQuality = 25;
          break;
        }
      }
      aggressiveScale -= 0.08;
    }
  }

  // Clean up temp file
  try {
    if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
  } catch {
    // Ignore
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error("FFmpeg failed to generate compressed image. Please ensure FFmpeg is properly installed.");
  }

  const finalStats = fs.statSync(outputPath);
  if (finalStats.size > targetBytes) {
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch {
      // Ignore
    }
    throw new Error(
      `Could not compress image below target size of ${targetSizeMB} MB (${formatBytes(finalStats.size)}). Please choose a larger target size.`
    );
  }

  const { ratioPercent } = calculateCompressionRatio(originalSizeBytes, finalStats.size);
  const finalW = Math.max(64, Math.round(probe.width * bestScale));
  const finalH = Math.max(64, Math.round(probe.height * bestScale));

  onProgress?.(100, "Done!");

  return {
    success: true,
    inputPath,
    outputPath,
    originalSizeBytes,
    compressedSizeBytes: finalStats.size,
    targetSizeBytes: targetBytes,
    compressionRatio: ratioPercent,
    resolution: {
      originalWidth: probe.width,
      originalHeight: probe.height,
      newWidth: finalW,
      newHeight: finalH,
    },
    details: `Format: ${outputExt.toUpperCase()}, Quality: ${bestQuality}%, Resolution: ${finalW}x${finalH}`,
  };
}
