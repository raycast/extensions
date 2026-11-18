import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import type { FormValues } from "../types";

import path from "path";
import { inspectMedia } from "./mediaInfo";
import { encodeGif } from "./gifski";
import { findFFmpegTools, selectVideoEncoder, probeHardwareEncoder, encoderOptions } from "./ffmpegRuntime";

export interface ConversionTask {
  id: number;
  file: string;
  started: Date;
  elapsed?: number;
  progress: number;
  fps: number;
  ffmpeg?: ffmpeg.FfmpegCommand;
  abortController?: AbortController;
  outputFile?: string;
  warning?: string;
  status: "converting" | "done" | "queued" | "error" | "cancelled";
}
const audioCodecs: Record<string, string> = {
  webm: "libopus",
  mpeg: "mp2",
  default: "aac",
};
const currentTasks: ConversionTask[] = [];

export async function convertVideo(values: FormValues, progress: (task: ConversionTask[]) => void) {
  setFFmpegPath();
  currentTasks.splice(0, currentTasks.length);

  values.videoFiles.forEach((file: string, i: number) => {
    const task: ConversionTask = {
      id: i,
      file,
      started: new Date(),
      fps: 0,
      progress: 0,
      status: "queued",
    };
    currentTasks.push(task);
    return task;
  });

  progress(currentTasks);
  for (const task of currentTasks) {
    await convertFile(task, values, (t) => {
      currentTasks[t.id] = t;
      progress(currentTasks);
    });
  }
}

async function convertFile(task: ConversionTask, params: FormValues, progress: (task: ConversionTask) => void) {
  if (task.status === "done" || task.status === "error" || task.status === "cancelled") {
    progress(task);
    return;
  }

  task.status = "converting";
  task.progress = 0;
  task.started = new Date();
  progress(task);
  let bitrate = 0;

  try {
    const info = await inspectMedia(task.file);
    const duration = info.duration;

    const parsedPath = path.parse(task.file);
    const originalName = parsedPath.name;
    const originalExt = parsedPath.ext;

    const outputDir = path.join(params.outputFolder[0], params.subfolderName);
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create output directory: ${error.message}`);
      }
      throw new Error("Failed to create output directory");
    }

    let fileName: string;

    if (params.rename && params.rename.trim() !== "") {
      fileName = params.rename
        .replace(/{name}/g, originalName)
        .replace(/{ext}/g, originalExt.replace(".", ""))
        .replace(/{format}/g, params.videoFormat)
        .replace(/{codec}/g, params.videoFormat === "gif" ? "gif" : params.videoCodec)
        .replace(/{len}/g, `${duration.toFixed()}s`);
    } else {
      fileName = originalName;
    }

    const outputPath = getAvailableFilePath(outputDir, fileName, params.videoFormat);
    task.outputFile = outputPath;
    if (["cancelled"].includes(task.status)) {
      progress(task);
      return;
    }
    if (params.videoFormat === "gif") {
      task.abortController = new AbortController();
      await encodeGif({
        input: task.file,
        output: outputPath,
        quality: params.gifQuality,
        fps: params.gifFps,
        info,
        signal: task.abortController.signal,
        onProgress: (percent) => {
          task.progress = Math.round(percent);
          progress(task);
        },
      });
      await finishConversion(task, params, progress);
      return;
    }

    if (params.compressionMode === "bitrate") {
      bitrate = parseInt(params.bitrate);
    } else if (params.compressionMode === "filesize") {
      const size = parseFloat(params.maxSize);
      const sizeKb = size * 1000 * 8;
      const audioBitrate = params.removeAudio ? 0 : parseInt(params.audioBitrate);
      bitrate = Math.floor((sizeKb - audioBitrate * duration) / duration);
      if (bitrate <= 0) {
        throw new Error("Bitrate is too low for the selected file size");
      }
    } else {
      throw new Error("Invalid compression mode");
    }

    const video = ffmpeg().input(task.file);
    task.ffmpeg = video;
    progress(task);
    if (!params.removeAudio && params.audioFiles.length) video.input(params.audioFiles[0]);

    const encoders = await new Promise<ffmpeg.Encoders>((resolve, reject) => {
      ffmpeg.getAvailableEncoders((error, result) => (error ? reject(error) : resolve(result)));
    });
    const available = new Set(Object.keys(encoders));
    const tools = findFFmpegTools();
    if (!tools) throw new Error("FFmpeg and ffprobe are required");
    const videoCodec = await selectVideoEncoder(
      params.videoCodec,
      params.useHardwareAcceleration,
      available,
      (encoder) => probeHardwareEncoder(tools.ffmpeg, encoder),
    );
    if (["cancelled"].includes(task.status)) {
      progress(task);
      return;
    }
    const audioCodec = audioCodecs[params.videoFormat] || audioCodecs.default;
    if (!params.removeAudio && !available.has(audioCodec)) {
      throw new Error(`FFmpeg is missing ${audioCodec}. Install a full FFmpeg build.`);
    }

    const options = [
      `-c:v ${videoCodec}`,
      "-map 0:v:0",
      `-b:v ${bitrate}k`,
      `-minrate ${bitrate}k`,
      `-maxrate ${bitrate}k`,
      `-bufsize ${bitrate * 2}k`,
      ...encoderOptions(videoCodec, params.preset),
      "-y",
    ];

    if (params.removeAudio) {
      options.push("-an");
    } else {
      options.push(
        `-c:a ${audioCodec}`,
        `-b:a ${params.audioBitrate}k`,
        params.audioFiles.length ? "-map 1:a:0" : "-map 0:a:0?",
      );
    }

    if (params.videoCodec === "h265" && ["mp4", "mov"].includes(params.videoFormat)) {
      options.push("-vtag hvc1");
    }

    video.outputOptions(options);
    video.duration(duration);
    return new Promise((resolve, reject) => {
      video.on("error", (err) => {
        if (task.status !== "cancelled") task.status = "error";
        progress(task);
        console.log(`Error: ${err.message}`);
        reject(err);
      });
      video.on("end", () => {
        void finishConversion(task, params, progress).then(() => resolve(true), reject);
      });
      video.on("progress", (p) => {
        if (p.percent) task.progress = Math.round(p.percent);
        if (p.frames) task.fps = p.currentFps;
        progress(task);
      });

      video.saveToFile(outputPath);
    });
  } catch (error) {
    if (["cancelled"].includes(task.status)) {
      progress(task);
      return;
    }
    task.status = "error";
    progress(task);
    throw error;
  }
}

export function cancelConversion(): void {
  currentTasks.forEach((task) => {
    if (["done", "error", "cancelled"].includes(task.status)) return;

    task.status = "cancelled";
    task.progress = 0;
    task.fps = 0;
    task.abortController?.abort();

    if (task.ffmpeg) {
      try {
        task.ffmpeg.kill("SIGTERM");
        // Give it a moment to terminate gracefully
        setTimeout(() => {
          const ffmpegInstance = task.ffmpeg;
          if (ffmpegInstance) {
            ffmpegInstance.kill("SIGKILL");
          }
        }, 1000);
      } catch (error) {
        console.error("Error killing FFmpeg process:", error);
      }
    }
  });
}

export function isFFmpegInstalled(): boolean {
  return !!findFFmpegTools();
}

export function setFFmpegPath(): void {
  const tools = findFFmpegTools();
  if (!tools) throw new Error("FFmpeg and ffprobe not found");
  ffmpeg.setFfmpegPath(tools.ffmpeg);
  ffmpeg.setFfprobePath(tools.ffprobe);
}

function getAvailableFilePath(outputDir: string, fileName: string, extension: string): string {
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  const MAX_ATTEMPTS = 100;

  let finalName = `${fileName}${ext}`;
  let counter = 1;
  let fullPath = path.join(outputDir, finalName);

  while (fs.existsSync(fullPath)) {
    finalName = `${fileName}_${counter}${ext}`;
    fullPath = path.join(outputDir, finalName);

    if (counter >= MAX_ATTEMPTS) {
      throw new Error("Could not find available filename after 100 attempts");
    }

    counter++;
  }

  return fullPath;
}

async function finishConversion(
  task: ConversionTask,
  params: FormValues,
  progress: (task: ConversionTask) => void,
): Promise<void> {
  task.status = "done";
  task.progress = 100;
  task.elapsed = Math.floor((Date.now() - task.started.getTime()) / 1000);
  if (params.deleteOriginalFiles) {
    try {
      await fs.promises.unlink(task.file);
    } catch (error) {
      task.warning = `Converted, but could not delete original: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  progress(task);
}
