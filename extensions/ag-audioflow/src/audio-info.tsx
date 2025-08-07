import { ActionPanel, Action, List, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { AudioProcessor } from "./utils/audioProcessor";
import { loadSelectedAudioFiles, checkFFmpegAndNotify } from "./utils/fileUtils";
import path from "path";
import { showFailureToast } from "@raycast/utils";

interface AudioInfoItem {
  title: string;
  subtitle: string;
  accessories?: Array<{ text: string }>;
}

export default function AudioInfo() {
  const [audioInfoItems, setAudioInfoItems] = useState<AudioInfoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      // Check FFmpeg availability first (for consistency, even though not strictly needed)
      await checkFFmpegAndNotify();

      // Then load selected files
      await loadSelectedFiles();
    }
    initialize();
  }, []);

  async function loadSelectedFiles() {
    setIsLoading(true);
    try {
      const audioFiles = await loadSelectedAudioFiles();

      if (audioFiles.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Audio Files",
          message: "Please select audio files in Finder and run this command again",
        });
        setIsLoading(false);
        return;
      }

      await loadAudioInfo(audioFiles);
    } catch (error) {
      showFailureToast(error, {
        title: "Failed to load selected files",
      });
    }
    setIsLoading(false);
  }

  async function loadAudioInfo(files: string[]) {
    const items: AudioInfoItem[] = [];

    for (const filePath of files) {
      try {
        const info = await AudioProcessor.getAudioInfo(filePath);
        const fileName = path.basename(filePath);

        items.push(
          {
            title: `📁 ${fileName}`,
            subtitle: `File: ${filePath}`,
          },
          {
            title: "⏱️ Duration",
            subtitle: AudioProcessor.formatDuration(info.duration),
            accessories: [{ text: `${info.duration.toFixed(2)}s` }],
          },
          {
            title: "🎵 Format",
            subtitle: info.format.toUpperCase(),
          },
          {
            title: "📊 Bitrate",
            subtitle: typeof info.bitrate === "string" ? info.bitrate : `${info.bitrate} bps`,
          },
          {
            title: "🔊 Sample Rate",
            subtitle: `${info.sampleRate} Hz`,
          },
          {
            title: "🎛️ Channels",
            subtitle: info.channels === 1 ? "Mono" : info.channels === 2 ? "Stereo" : `${info.channels} channels`,
            accessories: [{ text: `${info.channels}` }],
          },
          {
            title: "💾 File Size",
            subtitle: AudioProcessor.formatFileSize(info.size),
            accessories: [{ text: `${info.size} bytes` }],
          },
        );

        if (files.length > 1 && filePath !== files[files.length - 1]) {
          items.push({
            title: "─────────────────",
            subtitle: "",
          });
        }
      } catch (error) {
        items.push({
          title: `❌ Error loading ${path.basename(filePath)}`,
          subtitle: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    setAudioInfoItems(items);
  }

  async function copyToClipboard() {
    const infoText = audioInfoItems
      .filter((item) => !item.title.startsWith("─"))
      .map((item) => `${item.title}: ${item.subtitle}`)
      .join("\n");

    await Clipboard.copy(infoText);
    showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: "Audio file information copied successfully",
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search audio file information...">
      {audioInfoItems.map((item, index) => (
        <List.Item
          key={index}
          title={item.title}
          subtitle={item.subtitle}
          accessories={item.accessories}
          actions={
            <ActionPanel>
              <Action title="Copy All Info to Clipboard" onAction={copyToClipboard} />
              <Action title="Refresh" onAction={loadSelectedFiles} />
            </ActionPanel>
          }
        />
      ))}

      {!isLoading && audioInfoItems.length === 0 && (
        <List.EmptyView
          title="No Audio Files Selected"
          description="Select audio files in Finder and run this command to view detailed information about them."
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={loadSelectedFiles} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
