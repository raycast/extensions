import { ActionPanel, Action, List, Detail, Form, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { getTidalConfig, setTidalConfig, checkTidalInstallation, TidalConfig, validateConfigValue } from "./utils";

interface ConfigItem {
  key: string;
  value: string;
  inputType: "text" | "dropdown" | "path" | "format";
  description: string;
  options?: string[];
}

const CONFIG_DESCRIPTIONS: Record<
  string,
  { inputType: ConfigItem["inputType"]; description: string; options?: string[] }
> = {
  // Audio Quality
  quality_audio: {
    inputType: "dropdown",
    description: "Desired audio download quality",
    options: ["LOW", "HIGH", "LOSSLESS", "HI_RES_LOSSLESS"],
  },
  quality_video: {
    inputType: "dropdown",
    description: "Desired video download quality",
    options: ["360", "480", "720", "1080"],
  },

  // Paths and Formats
  download_base_path: { inputType: "path", description: "Where to store the downloaded media" },
  format_album: {
    inputType: "format",
    description: "Where to download albums and how to name the items",
    options: [
      "Tracks/{album_artist}/{album_title}/{track_volume_num_optional}{album_track_num}. {artist_name} - {track_title}",
      "{album_artist} - {album_title}/{track_num} - {track_title}",
      "{artist_name}/{album_title}/{track_num}. {track_title}",
      "Albums/{album_artist} - {album_title}{album_explicit}/{track_volume_num_optional}{album_track_num}. {artist_name} - {track_title}{album_explicit}",
    ],
  },
  format_playlist: {
    inputType: "format",
    description: "Where to download playlists and how to name the items",
    options: [
      "Tracks/{album_artist}/{album_title}/{track_volume_num_optional}{album_track_num}. {artist_name} - {track_title}",
      "Playlists/{playlist_name}/{artist_name} - {track_title}",
      "Playlists/{playlist_name}/{list_pos}. {artist_name} - {track_title}",
      "{playlist_name}/{track_num} - {artist_name} - {track_title}",
    ],
  },
  format_mix: {
    inputType: "format",
    description: "Where to download mixes and how to name the items",
    options: [
      "Mix/{mix_name}/{artist_name} - {track_title}",
      "Mixes/{mix_name}/{track_num} - {track_title}",
      "{mix_name}/{artist_name} - {track_title}",
    ],
  },
  format_track: {
    inputType: "format",
    description: "Where to download tracks and how to name the items",
    options: [
      "Tracks/{album_artist}/{album_title}/{track_volume_num_optional}{album_track_num}. {artist_name} - {track_title}",
      "Tracks/{artist_name} - {track_title}{track_explicit}",
      "{artist_name}/{track_title}",
      "Singles/{artist_name} - {track_title}",
    ],
  },
  format_video: {
    inputType: "format",
    description: "Where to download videos and how to name the items",
    options: [
      "Videos/{artist_name} - {track_title}{track_explicit}",
      "Videos/{artist_name}/{track_title}",
      "{artist_name} - {track_title} [Video]",
    ],
  },

  // Cover/Metadata Settings
  metadata_cover_dimension: {
    inputType: "dropdown",
    description: "The dimensions of the cover image embedded into the track",
    options: ["320", "640", "1280"],
  },
  metadata_cover_embed: {
    inputType: "dropdown",
    description: "Embed album cover into file",
    options: ["True", "False"],
  },
  cover_album_file: {
    inputType: "dropdown",
    description: "Save cover to 'cover.jpg', if an album is downloaded",
    options: ["True", "False"],
  },
  metadata_replay_gain: {
    inputType: "dropdown",
    description: "Replay gain information will be written to metadata",
    options: ["True", "False"],
  },

  // Download Behavior
  skip_existing: {
    inputType: "dropdown",
    description: "Skip download if file already exists",
    options: ["True", "False"],
  },
  download_delay: {
    inputType: "dropdown",
    description: "Activate randomized download delay to mimic human behaviour",
    options: ["True", "False"],
  },
  video_download: {
    inputType: "dropdown",
    description: "Allow download of videos",
    options: ["True", "False"],
  },
  video_convert_mp4: {
    inputType: "dropdown",
    description: "Convert downloaded videos to MP4 format",
    options: ["True", "False"],
  },
  extract_flac: {
    inputType: "dropdown",
    description: "Extract FLAC audio tracks from MP4 containers",
    options: ["True", "False"],
  },
  symlink_to_track: {
    inputType: "dropdown",
    description: "Create symlinks to track directory for albums/playlists",
    options: ["True", "False"],
  },
  playlist_create: {
    inputType: "dropdown",
    description: "Creates a '_playlist.m3u8' file for downloaded albums/playlists",
    options: ["True", "False"],
  },

  // Lyrics Settings
  lyrics_embed: {
    inputType: "dropdown",
    description: "Embed lyrics in audio file, if lyrics are available",
    options: ["True", "False"],
  },
  lyrics_file: {
    inputType: "dropdown",
    description: "Save lyrics to separate *.lrc file, if lyrics are available",
    options: ["True", "False"],
  },

  // Numeric Settings
  downloads_concurrent_max: { inputType: "text", description: "Maximum concurrent number of downloads (threads)" },
  downloads_simultaneous_per_track_max: {
    inputType: "text",
    description: "Maximum number of simultaneous chunk downloads per track",
  },
  download_delay_sec_min: { inputType: "text", description: "Lower boundary for download delay in seconds" },
  download_delay_sec_max: { inputType: "text", description: "Upper boundary for download delay in seconds" },
  album_track_num_pad_min: {
    inputType: "text",
    description: "Minimum length of album track count, padded with zeroes",
  },

  // Path Settings
  path_binary_ffmpeg: { inputType: "path", description: "Path to FFmpeg binary file (executable)" },
};

export default function ConfigCommand() {
  const [config, setConfig] = useState<TidalConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setIsLoading(true);

    // Check if tidal-dl-ng is installed
    const installed = await checkTidalInstallation();
    setIsInstalled(installed);

    if (!installed) {
      setIsLoading(false);
      return;
    }

    try {
      const tidalConfig = await getTidalConfig();
      console.log("Loaded config:", tidalConfig);
      if (tidalConfig.format_album) {
        console.log("format_album value:", tidalConfig.format_album);
        console.log("format_album length:", tidalConfig.format_album.length);
      }
      setConfig(tidalConfig);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getConfigItems(): ConfigItem[] {
    const items: ConfigItem[] = [];

    // Normalize boolean values for consistent display
    const normalizeValue = (val: string): string => {
      if (val === "true") return "True";
      if (val === "false") return "False";
      return val;
    };

    for (const [key, value] of Object.entries(config)) {
      const desc = CONFIG_DESCRIPTIONS[key];
      items.push({
        key,
        value: normalizeValue(value || ""),
        inputType: desc?.inputType || "text",
        description: desc?.description || key,
        options: desc?.options,
      });
    }

    // Sort items to show known configs first
    return items.sort((a, b) => {
      const aKnown = CONFIG_DESCRIPTIONS[a.key] ? 0 : 1;
      const bKnown = CONFIG_DESCRIPTIONS[b.key] ? 0 : 1;
      return aKnown - bKnown || a.key.localeCompare(b.key);
    });
  }

  function formatValue(value: string, truncate: boolean = false): string {
    if (!value || value === "") return "Not set";
    if (truncate && value.length > 50) {
      return value.substring(0, 47) + "...";
    }
    return value;
  }

  if (isInstalled === false) {
    return (
      <Detail
        markdown="# tidal-dl-ng Not Found

Please ensure tidal-dl-ng is installed on your system (or remote server).

## Installation
```bash
pip install tidal-dl-ng
```"
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search configuration..."
      actions={
        <ActionPanel>
          <Action
            title="Refresh Configuration"
            icon={Icon.ArrowClockwise}
            onAction={loadConfig}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {getConfigItems().map((item) => (
        <List.Item
          key={item.key}
          title={item.key}
          subtitle={formatValue(item.value)}
          accessories={[{ text: item.description }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Value"
                icon={Icon.Pencil}
                target={<EditConfigForm item={item} onSave={loadConfig} />}
              />
              <Action
                title="Refresh Configuration"
                icon={Icon.ArrowClockwise}
                onAction={loadConfig}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.CopyToClipboard
                title="Copy Value"
                content={formatValue(item.value)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.Push
                title="View Full Value"
                icon={Icon.Eye}
                target={
                  <Detail
                    markdown={`# ${item.key}\n\n## Current Value\n\`\`\`\n${formatValue(item.value)}\n\`\`\`\n\n## Description\n${item.description}`}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard title="Copy Value" content={formatValue(item.value)} />
                      </ActionPanel>
                    }
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function EditConfigForm({ item, onSave }: { item: ConfigItem; onSave: () => void }) {
  const { pop } = useNavigation();

  // Normalize boolean values for display
  const normalizeValue = (val: string): string => {
    if (val === "true") return "True";
    if (val === "false") return "False";
    return val;
  };

  const [value, setValue] = useState(normalizeValue(item.value));
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { value: string }) {
    setIsLoading(true);

    try {
      console.log(`Form submit: ${item.key} = ${values.value}`);

      // Validate the value before submitting
      const validation = validateConfigValue(item.key, values.value);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      console.log("Validation passed, calling setTidalConfig");
      await setTidalConfig(item.key, values.value);
      console.log("setTidalConfig completed, refreshing config");
      await onSave();
      pop();
    } catch (error) {
      console.error("Form submit error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title={item.key} text={item.description} />

      {item.inputType === "dropdown" && item.options ? (
        <Form.Dropdown id="value" title="Value" value={value} onChange={setValue}>
          {item.options.map((option) => (
            <Form.Dropdown.Item key={option} value={option} title={option} />
          ))}
        </Form.Dropdown>
      ) : item.inputType === "format" && item.options ? (
        <>
          <Form.Dropdown
            id="preset"
            title="Preset Formats"
            value={item.options.includes(value) ? value : ""}
            onChange={(newValue) => {
              if (newValue) setValue(newValue);
            }}
          >
            <Form.Dropdown.Item key="custom" value="" title="Custom Format" />
            {item.options.map((option) => (
              <Form.Dropdown.Item key={option} value={option} title={option} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="value"
            title="Format Pattern"
            placeholder="Enter format pattern..."
            value={value}
            onChange={setValue}
            info="Use variables like {artist_name}, {track_title}, {album_title}, etc."
          />
        </>
      ) : item.inputType === "path" ? (
        <Form.TextField
          id="value"
          title="Path"
          placeholder="Enter path..."
          value={value}
          onChange={setValue}
          info="Use ~ for home directory"
        />
      ) : (
        <Form.TextField
          id="value"
          title="Value"
          placeholder="Enter value..."
          value={value}
          onChange={setValue}
          info={item.key === "cover_size" ? "Enter a positive number" : undefined}
        />
      )}
    </Form>
  );
}
