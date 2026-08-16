import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { CompressionOptions, CompressionResult } from "./types";
import { generateOutputPath, calculateCompressionRatio } from "../utils/format";
import { getAugmentedEnv } from "../utils/system";

interface VideoProbeResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  audioBitrate: number;
}

export function probeVideo(filePath: string): Promise<VideoProbeResult> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=width,height,r_frame_rate,codec_type,bit_rate,duration",
        "-of",
        "json",
        filePath,
      ],
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
        return reject(new Error(`ffprobe failed (code ${code}): ${stderr}`));
      }

      try {
        const data = JSON.parse(stdout);
        let duration = parseFloat(data.format?.duration || "0");
        let width = 1920;
        let height = 1080;
        let fps = 30;
        let hasAudio = false;
        let audioBitrate = 128000;

        const videoStream = data.streams?.find(
          (s: { codec_type: string }) => s.codec_type === "video"
        );
        const audioStream = data.streams?.find(
          (s: { codec_type: string }) => s.codec_type === "audio"
        );

        if (videoStream) {
          width = videoStream.width || 1920;
          height = videoStream.height || 1080;
          if (videoStream.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
            if (num && den) fps = Math.round(num / den);
          }
          if (duration <= 0 && videoStream.duration) {
            duration = parseFloat(videoStream.duration);
          }
        }

        if (audioStream) {
          hasAudio = true;
          if (audioStream.bit_rate) {
            audioBitrate = parseInt(audioStream.bit_rate, 10);
          }
          if (duration <= 0 && audioStream.duration) {
            duration = parseFloat(audioStream.duration);
          }
        }

        resolve({ duration, width, height, fps, hasAudio, audioBitrate });
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

function parseFfmpegTime(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

export async function compressVideo(
  options: CompressionOptions
): Promise<CompressionResult> {
  const {
    inputPath,
    targetSizeMB,
    qualityMode = "smart_auto",
    onProgress,
  } = options;
  const originalStats = fs.statSync(inputPath);
  const originalSizeBytes = originalStats.size;
  const targetBytes = Math.floor(targetSizeMB * 1024 * 1024);

  const outputPath = options.outputPath || generateOutputPath(inputPath, "mp4");

  onProgress?.(5, "Analyzing video streams (ffprobe)...");
  const probe = await probeVideo(inputPath);

  if (probe.duration <= 0) {
    throw new Error("Could not detect valid video duration.");
  }

  // 1. Calculate bitrates (Target bits with 4% container muxing headroom)
  const totalTargetBits = targetBytes * 8 * 0.96;
  const totalTargetBitrate = totalTargetBits / probe.duration;

  // Decide audio bitrate dynamically based on overall budget
  let chosenAudioBitrate = 128000;
  if (totalTargetBitrate < 150000) {
    chosenAudioBitrate = Math.max(24000, Math.floor(totalTargetBitrate * 0.25));
  } else if (totalTargetBitrate < 400000) {
    chosenAudioBitrate = 64000; // 64 kbps for tight targets
  } else if (totalTargetBitrate < 800000) {
    chosenAudioBitrate = 96000; // 96 kbps
  }

  if (!probe.hasAudio) {
    chosenAudioBitrate = 0;
  }

  const minVideoBps = totalTargetBitrate < 150000 ? 25000 : 60000;
  const chosenVideoBitrate = Math.max(
    minVideoBps,
    Math.min(30000000, Math.floor(totalTargetBitrate - chosenAudioBitrate))
  );

  // 2. Intelligent resolution selection based on Bits-Per-Pixel (bpp)
  let targetWidth = probe.width;
  let targetHeight = probe.height;
  // Always ensure dimensions are divisible by 2 for libx264 compatibility
  let scaleFilter = "scale=trunc(iw/2)*2:trunc(ih/2)*2";

  if (qualityMode !== "strict_resolution") {
    const bpp =
      chosenVideoBitrate /
      (probe.width * probe.height * Math.max(24, probe.fps));

    if (bpp < 0.05) {
      // Need downscaling to prevent macroblocking
      if (probe.height > 1080) {
        scaleFilter = "scale=trunc(iw*1080/ih/2)*2:1080";
        targetHeight = 1080;
        targetWidth = Math.round((probe.width / probe.height) * 1080);
      } else if (probe.height > 720) {
        scaleFilter = "scale=trunc(iw*720/ih/2)*2:720";
        targetHeight = 720;
        targetWidth = Math.round((probe.width / probe.height) * 720);
      } else if (probe.height > 480) {
        scaleFilter = "scale=trunc(iw*480/ih/2)*2:480";
        targetHeight = 480;
        targetWidth = Math.round((probe.width / probe.height) * 480);
      }
    }
  }

  const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
  const passLogPrefix = path.join(os.tmpdir(), `waycompress_${Date.now()}`);

  // Helper to run ffmpeg pass
  const runFfmpegPass = (
    args: string[],
    passNumber: number,
    weight: number,
    offset: number
  ) => {
    return new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", args, { env: getAugmentedEnv() });

      ffmpeg.stderr.on("data", (data: Buffer) => {
        const text = data.toString();
        const timeMatch = text.match(/time=(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
        if (timeMatch && probe.duration > 0) {
          const currentTime = parseFfmpegTime(timeMatch[1]);
          const passPercent = Math.min(
            100,
            (currentTime / probe.duration) * 100
          );
          const totalPercent = Math.min(
            99,
            Math.round(offset + passPercent * weight)
          );
          onProgress?.(
            totalPercent,
            `Pass ${passNumber}/2: ${Math.round(passPercent)}% (Bitrate: ${Math.round(chosenVideoBitrate / 1000)}k)...`
          );
        }
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`FFmpeg pass ${passNumber} failed with code ${code}`)
          );
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
  };

  try {
    // PASS 1
    const pass1Args = [
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-b:v",
      `${chosenVideoBitrate}`,
      "-preset",
      "medium",
      "-pass",
      "1",
      "-passlogfile",
      passLogPrefix,
      ...(scaleFilter ? ["-vf", scaleFilter] : []),
      "-an",
      "-f",
      "null",
      nullDevice,
    ];

    onProgress?.(10, "Starting Pass 1 (Video analysis)...");
    await runFfmpegPass(pass1Args, 1, 0.45, 10);

    // PASS 2
    const pass2Args = [
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-b:v",
      `${chosenVideoBitrate}`,
      "-preset",
      "medium",
      "-pass",
      "2",
      "-passlogfile",
      passLogPrefix,
      ...(scaleFilter ? ["-vf", scaleFilter] : []),
      ...(probe.hasAudio
        ? [
            "-c:a",
            "aac",
            "-b:a",
            `${chosenAudioBitrate}`,
            ...(chosenAudioBitrate <= 48000 ? ["-ac", "1"] : []),
          ]
        : ["-an"]),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath,
    ];

    onProgress?.(55, "Starting Pass 2 (Encoding final video)...");
    await runFfmpegPass(pass2Args, 2, 0.42, 55);

    // Clean up temporary 2-pass log files
    try {
      const passFiles = [
        `${passLogPrefix}-0.log`,
        `${passLogPrefix}-0.log.mbtree`,
      ];
      for (const pf of passFiles) {
        if (fs.existsSync(pf)) fs.unlinkSync(pf);
      }
    } catch {
      // Ignore cleanup error
    }

    const finalStats = fs.statSync(outputPath);
    const { ratioPercent } = calculateCompressionRatio(
      originalSizeBytes,
      finalStats.size
    );

    onProgress?.(100, "Compression complete!");

    return {
      success: true,
      inputPath,
      outputPath,
      originalSizeBytes,
      compressedSizeBytes: finalStats.size,
      targetSizeBytes: targetBytes,
      compressionRatio: ratioPercent,
      durationSeconds: probe.duration,
      resolution: {
        originalWidth: probe.width,
        originalHeight: probe.height,
        newWidth: targetWidth,
        newHeight: targetHeight,
      },
      details: `Video Bitrate: ${Math.round(chosenVideoBitrate / 1000)}k, Audio: ${Math.round(chosenAudioBitrate / 1000)}k`,
    };
  } catch (err: unknown) {
    // Clean up temporary log files on error
    try {
      const passFiles = [
        `${passLogPrefix}-0.log`,
        `${passLogPrefix}-0.log.mbtree`,
      ];
      for (const pf of passFiles) {
        if (fs.existsSync(pf)) fs.unlinkSync(pf);
      }
    } catch {
      // Ignore
    }
    throw err;
  }
}
