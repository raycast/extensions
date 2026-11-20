import { getSelectedFinderItems, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "node:path";
import { hasAudioExtension, processAudio } from "./audio";
import { Preset, presets } from "./audio-options";

export async function runPreset(preset: Preset) {
  try {
    const selection = process.platform === "darwin" ? await getSelectedFinderItems().catch(() => []) : [];
    const files = selection.map((file) => file.path).filter(hasAudioExtension);
    if (!files.length) {
      await launchCommand({ name: "process-audio", type: LaunchType.UserInitiated, context: { preset } });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Applying ${presets[preset].title}` });
    try {
      const results = await processAudio(files, { preset }, (current, total) => {
        toast.message = `File ${current} of ${total}`;
      });
      const failed = results.filter((result) => result.status === "failure");
      const firstFailure = failed[0];
      const saved = results.length - failed.length;
      toast.style = firstFailure ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = saved === 1 ? "Saved 1 audio file" : `Saved ${saved} audio files`;
      toast.message = firstFailure
        ? `${failed.length} failed. ${path.basename(firstFailure.inputPath)}: ${firstFailure.error}`
        : results[0].status === "success" && saved === 1
          ? path.basename(results[0].outputPath)
          : "Saved beside the original files";
    } catch (error) {
      await toast.hide();
      throw error;
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Process Audio" });
  }
}
