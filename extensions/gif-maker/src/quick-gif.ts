import { statSync } from "fs";
import { basename } from "path";
import { Toast, getPreferenceValues, getSelectedFinderItems, open, showInFinder, showToast } from "@raycast/api";
import { FfmpegNotFoundError, convertToGif, isVideoFile } from "./ffmpeg";

export default async function Command() {
  const { defaultSize, defaultFps, defaultOptimize, defaultLoop, defaultDenoise, defaultReveal } =
    getPreferenceValues<Preferences.QuickGif>();

  let selected;
  try {
    selected = await getSelectedFinderItems();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Finder selection",
      message: "Select a video file in Finder, then run this command",
    });
    return;
  }

  const video = selected.find((item) => isVideoFile(item.path));
  if (!video) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No video selected",
      message: "Select a video file in Finder, then run this command",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating GIF",
    message: basename(video.path),
  });

  try {
    const outputPath = await convertToGif({
      inputPath: video.path,
      maxSize: defaultSize === "original" ? "original" : Number(defaultSize),
      fps: Number(defaultFps),
      loop: defaultLoop,
      denoise: defaultDenoise,
      optimize: defaultOptimize,
    });

    const sizeMb = statSync(outputPath).size / (1024 * 1024);
    toast.style = Toast.Style.Success;
    toast.title = "GIF created";
    toast.message = `${basename(outputPath)} · ${sizeMb.toFixed(1)} MB`;
    toast.primaryAction = {
      title: "Open GIF",
      onAction: () => open(outputPath),
    };

    if (defaultReveal) {
      await showInFinder(outputPath);
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    if (error instanceof FfmpegNotFoundError) {
      toast.title = "ffmpeg not found";
      toast.message = "Install it with `brew install ffmpeg`";
    } else {
      toast.title = "Conversion failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }
}
