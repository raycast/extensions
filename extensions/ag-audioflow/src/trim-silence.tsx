import { ActionPanel, Action, Form, showToast, Toast, showInFinder, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { AudioProcessor } from "./utils/audioProcessor";
import { loadSelectedAudioFile, checkFFmpegAndNotify } from "./utils/fileUtils";
import path from "path";

interface FormValues {
  inputFile: string[];
  startThreshold: string;
  endThreshold: string;
  outputDirectory: string[];
}

export default function TrimSilence() {
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      // Check FFmpeg availability first
      await checkFFmpegAndNotify();

      // Then load selected file
      const audioFile = await loadSelectedAudioFile();
      if (audioFile) {
        setSelectedFile(audioFile.path);
      }
      setIsLoading(false);
    }
    initialize();
  }, []);

  async function handleSubmit(values: FormValues) {
    if (!values.inputFile?.[0]) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Input File",
        message: "Please select an audio file to process",
      });
      return;
    }

    try {
      const inputPath = values.inputFile[0];
      const outputDir = values.outputDirectory?.[0] || path.dirname(inputPath);
      const outputPath = AudioProcessor.generateOutputPath(inputPath, "trimmed");

      const finalOutputPath = values.outputDirectory?.[0]
        ? path.join(outputDir, path.basename(outputPath))
        : outputPath;

      await AudioProcessor.trimSilence({
        inputPath,
        outputPath: finalOutputPath,
        startThreshold: values.startThreshold ? Number(values.startThreshold) : -50,
        endThreshold: values.endThreshold ? Number(values.endThreshold) : -50,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Trimming Complete",
        message: "Silence removed successfully",
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(finalOutputPath),
        },
      });

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Trimming Failed",
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
          <Action.SubmitForm title="Trim Silence" onSubmit={handleSubmit} />
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
        onChange={(files) => setSelectedFile(files[0] || "")}
      />

      <Form.TextField
        id="startThreshold"
        title="Start Silence Threshold (dB)"
        placeholder="-50"
        info="Audio levels below this threshold at the beginning will be considered silence and removed. Lower values (e.g., -60) detect quieter sounds as silence."
      />

      <Form.TextField
        id="endThreshold"
        title="End Silence Threshold (dB)"
        placeholder="-50"
        info="Audio levels below this threshold at the end will be considered silence and removed. Lower values (e.g., -60) detect quieter sounds as silence."
      />

      <Form.FilePicker
        id="outputDirectory"
        title="Output Directory (Optional)"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />

      <Form.Description text="Remove silence from the beginning and end of audio files. The threshold values determine what audio level is considered 'silence' - more negative values (like -60dB) will remove quieter sounds, while less negative values (like -30dB) will only remove very quiet sections." />
    </Form>
  );
}
