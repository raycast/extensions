import {
  showToast,
  Toast,
  getSelectedFinderItems,
  showHUD,
  open,
} from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import { buildOutputPath, findBinary } from "./utils";

const execFileAsync = promisify(execFile);

const MEDIA_EXTS = new Set([
  "mp4",
  "mkv",
  "mov",
  "avi",
  "webm",
  "gif",
  "m4v",
  "flv",
  "mp3",
  "wav",
  "aac",
  "flac",
  "ogg",
  "m4a",
  "wma",
]);

const AUDIO_EXTS = new Set(["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma"]);

export async function convertFinderMediaTo(
  targetExt: string,
  label: string,
): Promise<void> {
  let items;
  try {
    items = await getSelectedFinderItems();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No file selected in Finder",
    });
    return;
  }

  const valid = items.filter((i) =>
    MEDIA_EXTS.has(path.extname(i.path).replace(".", "").toLowerCase()),
  );

  if (!valid.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No compatible audio/video file selected",
    });
    return;
  }

  let ffmpegBin: string;
  try {
    ffmpegBin = findBinary("ffmpeg");
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "ffmpeg not found",
      message: "Install it with: brew install ffmpeg",
    });
    return;
  }

  const audioOnly = AUDIO_EXTS.has(targetExt);
  let converted = 0;
  let lastDir = "";

  for (const item of valid) {
    const outputPath = buildOutputPath(item.path, targetExt);
    await showToast({
      style: Toast.Style.Animated,
      title: `Converting to ${label}… (${converted + 1}/${valid.length})`,
    });

    try {
      const args = ["-y", "-i", item.path];
      if (audioOnly) args.push("-vn");
      args.push(outputPath);

      await execFileAsync(ffmpegBin, args, { timeout: 300_000 });
      if (fs.existsSync(outputPath)) {
        converted++;
        lastDir = path.dirname(outputPath);
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Error converting ${path.basename(item.path)}`,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (converted > 0) {
    await showHUD(
      `✅ ${converted} file${converted > 1 ? "s" : ""} converted to ${label}`,
    );
    await open(lastDir);
  }
}
