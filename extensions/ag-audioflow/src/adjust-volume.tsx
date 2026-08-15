import { ActionPanel, Action, Form, showToast, Toast, showInFinder, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { AudioProcessor, AudioInfo } from "./utils/audioProcessor";
import { loadSelectedAudioFile, checkFFmpegAndNotify } from "./utils/fileUtils";
import path from "path";

interface FormValues {
  inputFile: string[];
  presetVolumeChange: string;
  customVolumeChange: string;
  useGain: boolean;
  outputDirectory: string[];
}

export default function AdjustVolume() {
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);

  useEffect(() => {
    async function initialize() {
      // Check FFmpeg availability first
      await checkFFmpegAndNotify();

      // Then load selected file
      const audioFile = await loadSelectedAudioFile();
      if (audioFile) {
        setSelectedFile(audioFile.path);
        loadAudioInfo(audioFile.path);
      }
      setIsLoading(false);
    }
    initialize();
  }, []);

  async function loadAudioInfo(filePath: string) {
    try {
      const info = await AudioProcessor.getAudioInfo(filePath);
      setAudioInfo(info);
    } catch (error) {
      console.error("Error loading audio info:", error);
    }
  }

  async function handleSubmit(values: FormValues) {
    if (!values.inputFile?.[0]) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Input File",
        message: "Please select an audio file to process",
      });
      return;
    }

    // Determine which volume change value to use
    let volumeChange: number;
    if (values.customVolumeChange && values.customVolumeChange.trim() !== "") {
      // Use custom value if provided
      volumeChange = parseFloat(values.customVolumeChange);
    } else {
      // Use preset value
      volumeChange = parseFloat(values.presetVolumeChange);
    }

    if (isNaN(volumeChange)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Volume Change",
        message: "Please enter a valid number for volume change",
      });
      return;
    }

    if (volumeChange < -60 || volumeChange > 60) {
      showToast({
        style: Toast.Style.Failure,
        title: "Volume Change Out of Range",
        message: "Volume change must be between -60dB and +60dB",
      });
      return;
    }

    setIsLoading(true);

    try {
      const inputPath = values.inputFile[0];
      const outputDir = values.outputDirectory?.[0] || path.dirname(inputPath);
      const suffix = volumeChange >= 0 ? `volume_plus${volumeChange}dB` : `volume_minus${Math.abs(volumeChange)}dB`;
      const outputPath = AudioProcessor.generateOutputPath(inputPath, suffix);

      const finalOutputPath = values.outputDirectory?.[0]
        ? path.join(outputDir, path.basename(outputPath))
        : outputPath;

      await AudioProcessor.adjustVolume({
        inputPath,
        outputPath: finalOutputPath,
        volumeChange,
        useGain: values.useGain,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Volume Adjustment Complete",
        message: `Volume changed by ${volumeChange >= 0 ? "+" : ""}${volumeChange}dB`,
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(finalOutputPath),
        },
      });

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Volume Adjustment Failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
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
          <Action.SubmitForm title="Adjust Volume" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="inputFile"
        title="Input Audio File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        value={selectedFile ? [selectedFile] : []}
        onChange={(files) => {
          const file = files[0] || "";
          setSelectedFile(file);
          if (file) loadAudioInfo(file);
        }}
      />

      {audioInfo && (
        <Form.Description
          text={`Current Audio Info:\nDuration: ${AudioProcessor.formatDuration(audioInfo.duration)}\nBitrate: ${audioInfo.bitrate}\nSample Rate: ${audioInfo.sampleRate} Hz\nChannels: ${audioInfo.channels}\nFile Size: ${AudioProcessor.formatFileSize(audioInfo.size)}`}
        />
      )}

      <Form.Dropdown id="presetVolumeChange" title="Volume Adjustment (Preset)" defaultValue="0">
        <Form.Dropdown.Item value="-30" title="-30dB (Much Quieter)" />
        <Form.Dropdown.Item value="-20" title="-20dB (Significantly Quieter)" />
        <Form.Dropdown.Item value="-12" title="-12dB (Noticeably Quieter)" />
        <Form.Dropdown.Item value="-6" title="-6dB (Moderately Quieter)" />
        <Form.Dropdown.Item value="-3" title="-3dB (Slightly Quieter)" />
        <Form.Dropdown.Item value="0" title="0dB (No Change)" />
        <Form.Dropdown.Item value="3" title="+3dB (Slightly Louder)" />
        <Form.Dropdown.Item value="6" title="+6dB (Moderately Louder)" />
        <Form.Dropdown.Item value="12" title="+12dB (Noticeably Louder)" />
        <Form.Dropdown.Item value="20" title="+20dB (Significantly Louder)" />
      </Form.Dropdown>

      <Form.TextField
        id="customVolumeChange"
        title="Custom Volume Change (dB)"
        placeholder="Enter custom value (-60 to +60)"
        info="Enter a custom volume change in decibels. Positive values increase volume, negative values decrease it. Range: -60dB to +60dB"
      />

      <Form.Checkbox
        id="useGain"
        title="Precision Mode"
        label="Use high-precision gain processing"
        info="Enable for more precise volume control using linear gain calculation instead of logarithmic volume adjustment"
        defaultValue={false}
      />

      <Form.FilePicker
        id="outputDirectory"
        title="Output Directory (Optional)"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />

      <Form.Description text="Adjust the volume/gain of audio files with precise control. Volume changes are measured in decibels (dB). Every +6dB approximately doubles the perceived loudness, while -6dB halves it. Use precision mode for more accurate gain control when making subtle adjustments." />
    </Form>
  );
}
