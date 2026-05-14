import { ActionPanel, Action, Form, showToast, Toast, showInFinder, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { AudioProcessor, AudioInfo } from "./utils/audioProcessor";
import { loadSelectedAudioFile, checkFFmpegAndNotify } from "./utils/fileUtils";
import path from "path";

interface FormValues {
  inputFile: string[];
  targetLevel: string;
  outputDirectory: string[];
}

export default function NormalizeAudio() {
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
        message: "Please select an audio file to normalize",
      });
      return;
    }

    setIsLoading(true);

    try {
      const inputPath = values.inputFile[0];
      const outputDir = values.outputDirectory?.[0] || path.dirname(inputPath);
      const outputPath = AudioProcessor.generateOutputPath(inputPath, "normalized");

      const finalOutputPath = values.outputDirectory?.[0]
        ? path.join(outputDir, path.basename(outputPath))
        : outputPath;

      await AudioProcessor.normalizeAudio({
        inputPath,
        outputPath: finalOutputPath,
        targetLevel: values.targetLevel ? Number(values.targetLevel) : -23,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Normalization Complete",
        message: "Audio normalized successfully",
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(finalOutputPath),
        },
      });

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Normalization Failed",
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
          <Action.SubmitForm title="Normalize Audio" onSubmit={handleSubmit} />
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

      <Form.Dropdown id="targetLevel" title="Target Loudness Level (LUFS)" defaultValue="-23">
        <Form.Dropdown.Item value="-16" title="-16 LUFS (Streaming/Radio)" />
        <Form.Dropdown.Item value="-18" title="-18 LUFS (YouTube)" />
        <Form.Dropdown.Item value="-23" title="-23 LUFS (Broadcast Standard)" />
        <Form.Dropdown.Item value="-14" title="-14 LUFS (Spotify Loud)" />
        <Form.Dropdown.Item value="-11" title="-11 LUFS (CD Master)" />
      </Form.Dropdown>

      <Form.FilePicker
        id="outputDirectory"
        title="Output Directory (Optional)"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />

      <Form.Description text="Normalize audio levels using the EBU R128 loudness standard. This ensures consistent volume across different audio files. Lower LUFS values result in quieter audio, while higher values result in louder audio. -23 LUFS is the broadcast standard, while -14 to -16 LUFS is common for streaming platforms." />
    </Form>
  );
}
