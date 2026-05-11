import { ActionPanel, Action, Form, showToast, Toast, showInFinder, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { AudioProcessor, AudioInfo } from "./utils/audioProcessor";
import { loadSelectedAudioFile, checkFFmpegAndNotify } from "./utils/fileUtils";
import path from "path";

interface FormValues {
  inputFile: string[];
  outputBaseName: string;
}

export default function SplitStereo() {
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
        message: "Please select a stereo audio file to split",
      });
      return;
    }

    if (audioInfo && audioInfo.channels !== 2) {
      showToast({
        style: Toast.Style.Failure,
        title: "Not Stereo Audio",
        message: "Selected file must be stereo (2 channels) to split",
      });
      return;
    }

    setIsLoading(true);

    try {
      await AudioProcessor.splitStereoToMono({
        inputPath: values.inputFile[0],
        outputDirectory: path.dirname(values.inputFile[0]),
        outputBaseName: values.outputBaseName || undefined,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Stereo Split Complete",
        message: "Left and right channels saved successfully",
        primaryAction: {
          title: "Show Output Folder",
          onAction: () => showInFinder(path.dirname(values.inputFile[0])),
        },
      });

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Stereo Split Failed",
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
          <Action.SubmitForm title="Split Stereo" onSubmit={handleSubmit} />
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

      <Form.TextField
        id="outputBaseName"
        title="Output Base Name (Optional)"
        placeholder="Leave empty to use original filename"
        info="Base name for output files. Will create [basename]_left.ext and [basename]_right.ext in the same directory as the input file"
      />

      <Form.Description text="Split a stereo audio file into two separate mono files - one for the left channel and one for the right channel. This is useful for separating stereo recordings, isolating instruments, or preparing audio for specific mixing applications. The input file must be stereo (2 channels)." />
    </Form>
  );
}
