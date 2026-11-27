import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { selectedFinderFiles, sidecarPath } from "./lib/files";
import { errorMessage, transcribeFileTo } from "./lib/mw";
import { parsePositiveNumber } from "./lib/options";

export default async function Command() {
  const { subtitleFormat, maxCharsPerLine, overwriteSubtitles } = getPreferenceValues<Preferences.GenerateSubtitles>();
  const files = await selectedFinderFiles();
  if (files.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "Select videos or audio files in Finder first" });
    return;
  }

  const format = subtitleFormat === "vtt" ? "vtt" : "srt";
  const toast = await showToast({ style: Toast.Style.Animated, title: "Generating subtitles…" });
  const written: string[] = [];
  const skipped: string[] = [];
  try {
    for (const [index, file] of files.entries()) {
      const target = sidecarPath(file, format);
      if (existsSync(target) && !overwriteSubtitles) {
        skipped.push(basename(target));
        continue;
      }
      toast.message = `${index + 1}/${files.length} — ${basename(file)}`;
      await transcribeFileTo(file, target, {
        format,
        style: "subtitles",
        maxCharsPerLine: parsePositiveNumber(maxCharsPerLine),
        overwrite: overwriteSubtitles,
      });
      written.push(target);
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Subtitle generation failed";
    toast.message = errorMessage(error);
    return;
  }

  if (written.length === 0) {
    toast.style = Toast.Style.Failure;
    toast.title = "Subtitles already exist";
    toast.message = `${skipped.join(", ")}. Enable overwriting in the command preferences.`;
    return;
  }
  const skippedNote = skipped.length > 0 ? `, ${skipped.length} skipped` : "";
  const summary = written.length === 1 ? `${basename(written[0])} created` : `${written.length} subtitle files created`;
  await showHUD(`${summary}${skippedNote}`);
}
