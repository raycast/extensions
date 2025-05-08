import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import type { FormValues } from "../types";

import path from "path";

export interface ConversionTask {
  id: number;
  file: string;
  started: Date;
  elapsed?: number;
  progress: number;
  fps: number;
  ffmpeg?: ffmpeg.FfmpegCommand;
  status: "converting" | "done" | "queued" | "error" | "cancelled";
}
const codecs: Record<string, string> = {
  h264: "h264",
  h265: "libx265",
  mpeg4: "mpeg4",
  vp8: "libvpx",
  vp9: "libvpx-vp9",
  mpeg1: "mpeg1video",
  mpeg2: "mpeg2video",
};
const hwAcceleratedCodecs: Record<string, string> = {
  h264: "h264_videotoolbox",
  h265: "hevc_videotoolbox",
};
const audioCodecs: Record<string, string> = {
  webm: "libopus",
  mpeg: "mp2",
  default: "aac",
};
const currentTasks: ConversionTask[] = [];
const ffmpegPath = "/usr/local/bin/ffmpeg";
const altPath = "/opt/homebrew/bin/ffmpeg";
setFFmpegPath();

export async function convertVideo(values: FormValues, progress: (task: ConversionTask[]) => void) {
  values.videoFiles.map((file: string, i: number) => {
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
  if (task.status === "done" || task.status === "error" || task.status === "cancelled") return progress(task);

  task.status = "converting";
  task.progress = 0;
  task.started = new Date();
  let bitrate = 0;
  const duration = await getVideoDuration(task.file);

  if (params.compressionMode === "bitrate") {
    bitrate = parseInt(params.bitrate);
  } else if (params.compressionMode === "filesize") {
    const size = parseInt(params.maxSize);
    const sizeKb = size * 1000 * 8;
    bitrate = Math.floor((sizeKb - parseInt(params.audioBitrate) * duration) / duration);
  } else {
    throw new Error("Invalid compression mode");
  }

  const video = ffmpeg().input(task.file);
  task.ffmpeg = video;
  progress(task);
  if (params.audioFiles.length) video.input(params.audioFiles[0]);

  const parsedPath = path.parse(task.file);
  const originalName = parsedPath.name + parsedPath.ext;
  const originalExt = parsedPath.ext;

  const outputDir = path.join(params.outputFolder[0], params.subfolderName);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let fileName: string;

  if (params.rename && params.rename.trim() !== "") {
    fileName = params.rename
      .replace(/{n}/g, originalName)
      .replace(/{ext}/g, originalExt.replace(".", ""))
      .replace(/{format}/g, params.videoFormat)
      .replace(/{codec}/g, params.videoCodec)
      .replace(/{len}/g, `${duration.toFixed()}s`);
  } else {
    fileName = originalName;
  }

  const outputPath = getAvailableFilePath(outputDir, fileName, params.videoFormat);
  //const outputPath = path.join(outputDir, fileName);

  const videoCodec =
    (params.useHardwareAcceleration ? hwAcceleratedCodecs[params.videoCodec] : codecs[params.videoCodec]) ||
    codecs[params.videoCodec];
  const audioCodec = audioCodecs[params.videoFormat] || audioCodecs.default;

  const options = [
    `-c:a ${audioCodec}`,
    `-b:a ${params.audioBitrate}k`,
    `-c:v ${videoCodec}`,
    "-map 0:v:0",
    `-b:v ${bitrate}k`,
    `-minrate ${bitrate}k`,
    `-maxrate ${bitrate}k`,
    `-bufsize ${bitrate * 2}k`,
    `-preset ${params.preset}`,
    "-y",
  ];

  options.push(params.audioFiles.length ? "-map 1:a:0" : "-map 0:a:0");

  if (params.videoCodec === "h265") {
    options.push("-vtag hvc1");
  }

  video.outputOptions(options);
  video.duration(duration);
  return new Promise((res) => {
    video.on("error", (err) => {
      if (task.status !== "cancelled") task.status = "error";
      progress(task);
      //console.log(`Error converting ${task.file}`);
      console.log(`Error: ${err.message}`);

      res(false);
    });
    video.on("end", () => {
      task.status = "done";
      task.progress = 100;
      task.elapsed = Math.floor((new Date().getTime() - task.started.getTime()) / 1000);
      progress(task);
      if (params.deleteOriginalFiles) deleteFile(task.file);
      //console.log(`Finished converting ${task.file}`);
      res(true);
    });
    video.on("progress", (p) => {
      if (p.percent) task.progress = Math.round(p.percent);
      if (p.frames) task.fps = p.currentFps;
      //console.log(p);
      progress(task);
    });

    video.saveToFile(outputPath);
  });
}

export function cancelConversion(): void {
  currentTasks.map((task) => {
    if (["done", "error", "cancelled"].includes(task.status)) return task;
    task.status = "cancelled";
    task.progress = 0;
    task.fps = 0;
    task.ffmpeg?.kill("SIGTERM");
    return task;
  });
}

export function isFFmpegInstalled(): boolean {
  try {
    const exists = fs.existsSync(ffmpegPath) || fs.existsSync(altPath);
    return exists;
  } catch (error) {
    console.error("Error checking FFmpeg installation:", error);
    return false;
  }
}

export async function setFFmpegPath(): Promise<void> {
  let path = "";
  if (fs.existsSync(ffmpegPath)) path = ffmpegPath;
  else if (fs.existsSync(altPath)) path = altPath;
  else throw new Error("FFmpeg not found");

  ffmpeg.setFfmpegPath(path);
}

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      if (duration === undefined) return resolve(60);
      resolve(duration);
    });
  });
}

function getAvailableFilePath(outputDir: string, fileName: string, extension: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  const baseName = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  const ext = extension.startsWith(".") ? extension : `.${extension}`;

  let finalName = `${baseName}${ext}`;
  let counter = 1;
  let fullPath = path.join(outputDir, finalName);

  while (fs.existsSync(fullPath)) {
    finalName = `${baseName}_${counter}${ext}`;
    fullPath = path.join(outputDir, finalName);
    counter++;
  }

  return fullPath;
}

function deleteFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
