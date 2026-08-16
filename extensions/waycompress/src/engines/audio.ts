import fs from "fs";
import { spawn } from "child_process";
import { CompressionOptions, CompressionResult } from "./types";
import { generateOutputPath, calculateCompressionRatio, formatBytes } from "../utils/format";
import { getAugmentedEnv } from "../utils/system";

function probeAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration:stream=duration", "-of", "json", filePath],
      { env: getAugmentedEnv() }
    );

    let stdout = "";
    let stderr = "";

    ffprobe.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    ffprobe.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    ffprobe.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe failed: ${stderr}`));
      }
      try {
        const data = JSON.parse(stdout);
        let duration = parseFloat(data.format?.duration || "0");
        if (duration <= 0 && data.streams?.[0]?.duration) {
          duration = parseFloat(data.streams[0].duration);
        }
        resolve(duration);
      } catch (err) {
        reject(err);
      }
    });

    ffprobe.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "FFprobe is not installed or not in system PATH. Install FFmpeg via 'winget install Gyan.FFmpeg' (Windows) or 'brew install ffmpeg' (macOS)."
          )
        );
      } else {
        reject(err);
      }
    });
  });
}

export async function compressAudio(options: CompressionOptions): Promise<CompressionResult> {
  const { inputPath, targetSizeMB, onProgress } = options;
  const originalStats = fs.statSync(inputPath);
  const originalSizeBytes = originalStats.size;
  const targetBytes = Math.floor(targetSizeMB * 1024 * 1024);

  onProgress?.(10, "Analyzing audio file...");
  const duration = await probeAudioDuration(inputPath);

  if (duration <= 0) {
    throw new Error("Could not detect valid audio duration.");
  }

  // Target bits with 3% container overhead
  const totalTargetBits = targetBytes * 8 * 0.97;
  let targetBitrateBps = Math.floor(totalTargetBits / duration);

  // Clamp audio bitrate to sensible limits
  targetBitrateBps = Math.max(32000, Math.min(320000, targetBitrateBps));

  const outputPath = options.outputPath || generateOutputPath(inputPath, "m4a");

  onProgress?.(30, `Encoding audio at ${Math.round(targetBitrateBps / 1000)} kbps...`);

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(
      "ffmpeg",
      ["-y", "-i", inputPath, "-vn", "-c:a", "aac", "-b:a", `${targetBitrateBps}`, outputPath],
      { env: getAugmentedEnv() }
    );

    ffmpeg.stderr.on("data", () => {
      onProgress?.(70, "Encoding audio...");
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Audio encoding failed with code ${code}`));
      }
    });

    ffmpeg.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "FFmpeg is not installed or not in system PATH. Install FFmpeg via 'winget install Gyan.FFmpeg' (Windows) or 'brew install ffmpeg' (macOS)."
          )
        );
      } else {
        reject(err);
      }
    });
  });

  const finalStats = fs.statSync(outputPath);
  if (finalStats.size > targetBytes) {
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch {
      // Ignore
    }
    throw new Error(
      `Could not compress audio below target size of ${targetSizeMB} MB (${formatBytes(finalStats.size)}). File duration is too long for this target size at acceptable audio quality.`
    );
  }

  const { ratioPercent } = calculateCompressionRatio(originalSizeBytes, finalStats.size);

  onProgress?.(100, "Done!");

  return {
    success: true,
    inputPath,
    outputPath,
    originalSizeBytes,
    compressedSizeBytes: finalStats.size,
    targetSizeBytes: targetBytes,
    compressionRatio: ratioPercent,
    durationSeconds: duration,
    details: `Audio Bitrate: ${Math.round(targetBitrateBps / 1000)} kbps AAC`,
  };
}
