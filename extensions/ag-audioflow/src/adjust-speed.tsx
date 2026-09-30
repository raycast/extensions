import { ActionPanel, Action, Form, showToast, Toast, showInFinder, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { AudioProcessor, AudioInfo } from "./utils/audioProcessor";
import { loadSelectedAudioFile, checkFFmpegAndNotify } from "./utils/fileUtils";
import path from "path";

interface FormValues {
  inputFile: string[];
  speedPercentage: string;
  customSpeed: string;
  preservePitch: boolean;
  outputDirectory: string[];
}

export default function AdjustSpeed() {
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

    // Use custom speed if provided, otherwise use dropdown selection
    const speedPercentage = values.customSpeed ? parseFloat(values.customSpeed) : parseFloat(values.speedPercentage);

    if (isNaN(speedPercentage) || speedPercentage <= 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Speed",
        message: "Please enter a valid speed percentage greater than 0",
      });
      return;
    }

    if (speedPercentage < 10 || speedPercentage > 1000) {
      showToast({
        style: Toast.Style.Failure,
        title: "Speed Out of Range",
        message: "Speed must be between 10% and 1000% for optimal results",
      });
      return;
    }

    setIsLoading(true);

    try {
      const inputPath = values.inputFile[0];
      const outputDir = values.outputDirectory?.[0] || path.dirname(inputPath);
      const speedSuffix = `speed_${speedPercentage}percent${values.preservePitch ? "_pitched" : ""}`;
      const outputPath = AudioProcessor.generateOutputPath(inputPath, speedSuffix);

      const finalOutputPath = values.outputDirectory?.[0]
        ? path.join(outputDir, path.basename(outputPath))
        : outputPath;

      await AudioProcessor.adjustSpeed({
        inputPath,
        outputPath: finalOutputPath,
        speedPercentage,
        preservePitch: values.preservePitch,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Speed Adjustment Complete",
        message: `Audio speed changed to ${speedPercentage}%`,
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(finalOutputPath),
        },
      });

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Speed Adjustment Failed",
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
          <Action.SubmitForm title="Adjust Speed" onSubmit={handleSubmit} />
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
          text={`Current Audio Info:\nDuration: ${AudioProcessor.formatDuration(audioInfo.duration)}\nAt 200% speed: ~${AudioProcessor.formatDuration(audioInfo.duration / 2)}\nAt 50% speed: ~${AudioProcessor.formatDuration(audioInfo.duration * 2)}`}
        />
      )}

      <Form.Dropdown id="speedPercentage" title="Speed Preset" defaultValue="100">
        <Form.Dropdown.Item value="25" title="25% (Very Slow)" />
        <Form.Dropdown.Item value="50" title="50% (Half Speed)" />
        <Form.Dropdown.Item value="75" title="75% (Slower)" />
        <Form.Dropdown.Item value="100" title="100% (Normal Speed)" />
        <Form.Dropdown.Item value="125" title="125% (Faster)" />
        <Form.Dropdown.Item value="150" title="150% (1.5x Speed)" />
        <Form.Dropdown.Item value="200" title="200% (Double Speed)" />
        <Form.Dropdown.Item value="300" title="300% (Triple Speed)" />
      </Form.Dropdown>

      <Form.TextField
        id="customSpeed"
        title="Custom Speed Percentage"
        placeholder="Enter custom percentage (10-1000)"
        info="Override the preset with a custom speed percentage. Leave empty to use the preset above."
      />

      <Form.Checkbox
        id="preservePitch"
        title="Preserve Pitch"
        label="Maintain original pitch while changing speed"
        defaultValue={true}
        info="When enabled, the audio will speed up/slow down without changing the pitch (chipmunk/slow-motion effect avoided). Disable for classic speed change effects."
      />

      <Form.FilePicker
        id="outputDirectory"
        title="Output Directory (Optional)"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />

      <Form.Description
        text="Adjust the playback speed of audio files with precise percentage control:

• **Speed < 100%**: Slower playback (50% = half speed)
• **Speed > 100%**: Faster playback (200% = double speed)
• **Preserve Pitch**: Maintains original tone/pitch (recommended)
• **Range**: 10% to 1000% for optimal quality

Perfect for creating slow-motion effects, speeding up lectures, adjusting music tempo, or creating special audio effects."
      />
    </Form>
  );
}
