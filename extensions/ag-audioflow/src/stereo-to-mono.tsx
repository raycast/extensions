import { ActionPanel, Action, Form, showToast, Toast, showInFinder, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { AudioProcessor, AudioInfo } from "./utils/audioProcessor";
import { loadSelectedAudioFile, checkFFmpegAndNotify } from "./utils/fileUtils";
import path from "path";

interface FormValues {
  inputFile: string[];
  mixMethod: string;
  outputDirectory: string[];
}

export default function StereoToMono() {
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
        message: "Please select a stereo audio file to convert",
      });
      return;
    }

    if (audioInfo && audioInfo.channels !== 2) {
      showToast({
        style: Toast.Style.Failure,
        title: "Not Stereo Audio",
        message: "Selected file must be stereo (2 channels) to convert to mono",
      });
      return;
    }

    setIsLoading(true);

    try {
      const inputPath = values.inputFile[0];
      const outputDir = values.outputDirectory?.[0] || path.dirname(inputPath);
      const methodSuffix = values.mixMethod === "mix" ? "mono" : `mono_${values.mixMethod}`;
      const outputPath = AudioProcessor.generateOutputPath(inputPath, methodSuffix);

      const finalOutputPath = values.outputDirectory?.[0]
        ? path.join(outputDir, path.basename(outputPath))
        : outputPath;

      await AudioProcessor.convertStereoToMono({
        inputPath,
        outputPath: finalOutputPath,
        mixMethod: values.mixMethod as "mix" | "left" | "right",
      });

      showToast({
        style: Toast.Style.Success,
        title: "Conversion Complete",
        message: `Stereo converted to mono using ${values.mixMethod} method`,
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(finalOutputPath),
        },
      });

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Conversion Failed",
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
          <Action.SubmitForm title="Convert to Mono" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="inputFile"
        title="Input Stereo Audio File"
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
          text={`Audio Info:\nChannels: ${audioInfo.channels} ${audioInfo.channels === 2 ? "✅ (Stereo)" : "❌ (Not Stereo)"}\nDuration: ${AudioProcessor.formatDuration(audioInfo.duration)}\nSample Rate: ${audioInfo.sampleRate} Hz\nBitrate: ${audioInfo.bitrate}`}
        />
      )}

      <Form.Dropdown id="mixMethod" title="Conversion Method" defaultValue="mix">
        <Form.Dropdown.Item value="mix" title="Mix Both Channels" icon="🔀" />
        <Form.Dropdown.Item value="left" title="Use Left Channel Only" icon="⬅️" />
        <Form.Dropdown.Item value="right" title="Use Right Channel Only" icon="➡️" />
      </Form.Dropdown>

      <Form.FilePicker
        id="outputDirectory"
        title="Output Directory (Optional)"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />

      <Form.Description
        text="Convert stereo audio to mono using different methods:

• **Mix Both Channels**: Combines left and right channels equally (recommended for most cases)
• **Use Left Channel Only**: Keeps only the left channel audio 
• **Use Right Channel Only**: Keeps only the right channel audio

This is useful for reducing file size, compatibility with mono systems, or when you only need one channel of a stereo recording."
      />
    </Form>
  );
}
