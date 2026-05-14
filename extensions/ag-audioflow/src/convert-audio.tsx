import { ActionPanel, Action, Form, showToast, Toast, showInFinder, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { AudioProcessor } from "./utils/audioProcessor";
import { loadSelectedAudioFile, checkFFmpegAndNotify } from "./utils/fileUtils";
import { SUPPORTED_AUDIO_FORMATS, AUDIO_BITRATES, SAMPLE_RATES, AudioFormat, AudioBitrate, SampleRate } from "./types";
import path from "path";

interface FormValues {
  inputFile: string[];
  outputFormat: AudioFormat;
  bitrate: AudioBitrate;
  sampleRate: SampleRate;
  channels: string;
  outputDirectory: string[];
}

export default function ConvertAudio() {
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
    const inputFile = values.inputFile?.[0];
    if (!inputFile) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Input File",
        message: "Please select an audio file to convert",
      });
      return;
    }

    setIsLoading(true);

    try {
      const inputPath = inputFile;
      const outputDir = values.outputDirectory?.[0] || path.dirname(inputPath);
      const inputName = path.parse(inputPath).name;
      const outputPath = path.join(outputDir, `${inputName}_converted.${values.outputFormat}`);

      await AudioProcessor.convertAudio({
        inputPath,
        outputPath,
        format: values.outputFormat,
        bitrate: values.bitrate,
        sampleRate: Number(values.sampleRate),
        channels: values.channels ? Number(values.channels) : undefined,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Conversion Complete",
        message: "Audio file converted successfully",
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(outputPath),
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
          <Action.SubmitForm title="Convert Audio" onSubmit={handleSubmit} />
          <Action title="Select File" onAction={() => {}} />
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

      <Form.Dropdown id="outputFormat" title="Output Format" defaultValue="mp3">
        {SUPPORTED_AUDIO_FORMATS.map((format) => (
          <Form.Dropdown.Item key={format} value={format} title={format.toUpperCase()} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="bitrate" title="Bitrate" defaultValue="192k">
        {AUDIO_BITRATES.map((bitrate) => (
          <Form.Dropdown.Item key={bitrate} value={bitrate} title={bitrate} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="sampleRate" title="Sample Rate" defaultValue="44100">
        {SAMPLE_RATES.map((rate) => (
          <Form.Dropdown.Item key={rate} value={rate.toString()} title={`${rate} Hz`} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="channels" title="Channels" defaultValue="">
        <Form.Dropdown.Item value="" title="Keep Original" />
        <Form.Dropdown.Item value="1" title="Mono (1 channel)" />
        <Form.Dropdown.Item value="2" title="Stereo (2 channels)" />
      </Form.Dropdown>

      <Form.FilePicker
        id="outputDirectory"
        title="Output Directory (Optional)"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />

      <Form.Description text="Convert audio files between different formats with customizable quality settings. If no output directory is selected, the converted file will be saved in the same directory as the input file." />
    </Form>
  );
}
