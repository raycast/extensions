import { Action, Icon, showToast, Toast, showHUD } from "@raycast/api";
import { downloadAndCache } from "../../lib/cache";
import { saveToDownloads, copyFileToClipboard } from "../../lib/file";
import { stopAudio } from "../../lib/audio";
import { Sample } from "../../lib/types";

interface CopyFileActionProps {
  sample: Sample;
  onLoadingChange?: (isLoading: boolean) => void;
}

export function CopyFileAction({ sample, onLoadingChange }: CopyFileActionProps) {
  const handleCopyAudioFile = async () => {
    // Stop any currently playing audio
    await stopAudio();

    onLoadingChange?.(true);

    try {
      // Show downloading feedback
      showHUD("Downloading audio file...");

      // Download the file (uses cache if available)
      const { buffer, contentType } = await downloadAndCache(sample.sample);

      // Save to support directory
      const filePath = saveToDownloads(sample.sample, sample.name, buffer, contentType);

      // Copy file reference to clipboard
      copyFileToClipboard(filePath);

      // Show success feedback
      showHUD(`Copied ${sample.name}`);
    } catch (error) {
      await showToast({
        title: "Copy Failed",
        message: error instanceof Error ? error.message : "Could not download and copy audio file",
        style: Toast.Style.Failure,
      });
    } finally {
      onLoadingChange?.(false);
    }
  };

  return <Action title="Copy File" icon={Icon.Clipboard} onAction={handleCopyAudioFile} />;
}
