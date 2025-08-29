import { ActionPanel, Action, Form, showToast, Toast, showInFinder, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { AudioProcessor, AudioInfo } from "./utils/audioProcessor";
import { loadSelectedAudioFile, checkFFmpegAndNotify } from "./utils/fileUtils";
import path from "path";

interface FormValues {
  inputFile: string[];
  fadeInDuration: string;
  fadeOutDuration: string;
  outputDirectory: string[];
}

export default function AddFade() {
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

    const fadeIn = values.fadeInDuration ? Number(values.fadeInDuration) : 0;
    const fadeOut = values.fadeOutDuration ? Number(values.fadeOutDuration) : 0;

    if (fadeIn <= 0 && fadeOut <= 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Fade Effects",
        message: "Please specify at least one fade effect duration",
      });
      return;
    }

    setIsLoading(true);

    try {
      const inputPath = values.inputFile[0];
      const outputDir = values.outputDirectory?.[0] || path.dirname(inputPath);
      const outputPath = AudioProcessor.generateOutputPath(inputPath, "faded");

      const finalOutputPath = values.outputDirectory?.[0]
        ? path.join(outputDir, path.basename(outputPath))
        : outputPath;

      await AudioProcessor.addFadeEffects({
        inputPath,
        outputPath: finalOutputPath,
        fadeInDuration: fadeIn > 0 ? fadeIn : undefined,
        fadeOutDuration: fadeOut > 0 ? fadeOut : undefined,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Fade Effects Added",
        message: "Fade effects applied successfully",
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(finalOutputPath),
        },
      });

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Fade Effects Failed",
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
          <Action.SubmitForm title="Add Fade Effects" onSubmit={handleSubmit} />
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

      {audioInfo && <Form.Description text={`Audio Duration: ${AudioProcessor.formatDuration(audioInfo.duration)}`} />}

      <Form.TextField
        id="fadeInDuration"
        title="Fade In Duration (seconds)"
        placeholder="2"
        info="Duration for the fade-in effect at the beginning of the audio. Leave empty to skip fade-in."
      />

      <Form.TextField
        id="fadeOutDuration"
        title="Fade Out Duration (seconds)"
        placeholder="2"
        info="Duration for the fade-out effect at the end of the audio. Leave empty to skip fade-out."
      />

      <Form.FilePicker
        id="outputDirectory"
        title="Output Directory (Optional)"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />

      <Form.Description text="Add professional fade-in and fade-out effects to your audio files. Fade-in gradually increases the volume from silence to full volume at the beginning, while fade-out gradually decreases the volume to silence at the end." />
    </Form>
  );
}
