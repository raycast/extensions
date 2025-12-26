import { showToast, Toast, getSelectedFinderItems, showHUD, List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import { processBatch, generateBatchSummary } from "./utils/batch-processor";
import { ProcessingOptions, IMAGE_PRESETS, VIDEO_PRESETS, ResizePreset } from "./utils/types";

export default function Command() {
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleResize(preset: ResizePreset) {
    setIsProcessing(true);

    try {
      // Show initial loading toast
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting resize...",
        message: "Getting selected files",
      });

      // Get selected files from Finder/Explorer
      const selectedFiles = await getSelectedFinderItems();

      if (selectedFiles.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No files selected",
          message: "Please select one or more files to resize",
        });
        return;
      }

      const filePaths = selectedFiles.map((file) => file.path);

      // Determine if files are images or videos (check first file)

      // Process all files with resize only
      const options: ProcessingOptions = {
        compress: false,
        resize: true,
        resizePreset: preset,
      };

      const result = await processBatch(filePaths, options);

      // Show summary
      const summary = generateBatchSummary(result, "Resized");
      await showHUD(summary);

      // If there were errors, show them in a toast
      if (result.errors.length > 0 && result.errors.length < result.totalFiles) {
        const errorList = result.errors.map((e) => `${e.file}: ${e.error}`).join("\n");
        await showToast({
          style: Toast.Style.Failure,
          title: "Some files failed",
          message: errorList.substring(0, 200),
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <List isLoading={isProcessing} searchBarPlaceholder="Select a resize preset...">
      <List.Section title="Image Presets">
        {IMAGE_PRESETS.map((preset) => (
          <List.Item
            key={preset.name}
            title={preset.name}
            subtitle={preset.description}
            accessories={[
              {
                text: preset.maxWidth ? `${preset.maxWidth}px max` : `${preset.width}x${preset.height}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Resize with This Preset" onAction={() => handleResize(preset)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Video Presets">
        {VIDEO_PRESETS.map((preset) => (
          <List.Item
            key={preset.name}
            title={preset.name}
            subtitle={preset.description}
            accessories={[{ text: `${preset.width}x${preset.height}` }]}
            actions={
              <ActionPanel>
                <Action title="Resize with This Preset" onAction={() => handleResize(preset)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
