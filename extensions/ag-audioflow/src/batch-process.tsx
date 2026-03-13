import { ActionPanel, Action, Form, showToast, Toast, showInFinder, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { AudioProcessor } from "./utils/audioProcessor";
import { loadSelectedAudioFiles, checkFFmpegAndNotify } from "./utils/fileUtils";
import { SUPPORTED_AUDIO_FORMATS, AUDIO_BITRATES } from "./types";
import path from "path";

interface FormValues {
  inputFiles: string[];
  operation: string;
  outputFormat?: string;
  bitrate?: string;
  startThreshold?: string;
  endThreshold?: string;
  fadeInDuration?: string;
  fadeOutDuration?: string;
  targetLevel?: string;
  volumeChange?: string;
  useGain?: boolean;
  mixMethod?: string;
  speedPercentage?: string;
  preservePitch?: boolean;
  outputDirectory: string[];
}

interface ProcessingProgress {
  current: number;
  total: number;
  currentFile: string;
}

export default function BatchProcess() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);

  useEffect(() => {
    async function initialize() {
      // Check FFmpeg availability first
      await checkFFmpegAndNotify();

      // Then load selected files
      await loadSelectedFiles();
      setIsLoading(false);
    }
    initialize();
  }, []);

  async function loadSelectedFiles() {
    try {
      const audioFiles = await loadSelectedAudioFiles();
      setSelectedFiles(audioFiles);

      if (audioFiles.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Audio Files",
          message: "Please select audio files in Finder before using batch processing",
        });
      }
    } catch (error) {
      console.error("Error loading selected files:", error);
    }
  }

  async function handleSubmit(values: FormValues) {
    if (!values.inputFiles || values.inputFiles.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Input Files",
        message: "Please select audio files to process",
      });
      return;
    }

    if (!values.outputDirectory?.[0]) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Output Directory",
        message: "Please select an output directory for processed files",
      });
      return;
    }

    setIsLoading(true);
    const totalFiles = values.inputFiles.length;
    let processedFiles = 0;
    const results: { success: boolean; file: string; error?: string }[] = [];

    try {
      for (const inputFile of values.inputFiles) {
        setProgress({
          current: processedFiles + 1,
          total: totalFiles,
          currentFile: path.basename(inputFile),
        });

        try {
          const fileName = path.parse(inputFile).name;
          let outputPath: string;
          let suffix: string;

          switch (values.operation) {
            case "convert": {
              suffix = `converted`;
              const extension = values.outputFormat ? `.${values.outputFormat}` : path.extname(inputFile);
              outputPath = path.join(values.outputDirectory[0], `${fileName}_${suffix}${extension}`);

              await AudioProcessor.convertAudio({
                inputPath: inputFile,
                outputPath,
                format: (values.outputFormat as "mp3" | "aac" | "wav" | "flac" | "ogg") || "mp3",
                bitrate: values.bitrate,
              });
              break;
            }

            case "trim": {
              suffix = "trimmed";
              outputPath = path.join(values.outputDirectory[0], `${fileName}_${suffix}${path.extname(inputFile)}`);

              await AudioProcessor.trimSilence({
                inputPath: inputFile,
                outputPath,
                startThreshold: values.startThreshold ? Number(values.startThreshold) : -50,
                endThreshold: values.endThreshold ? Number(values.endThreshold) : -50,
              });
              break;
            }

            case "fade": {
              suffix = "faded";
              outputPath = path.join(values.outputDirectory[0], `${fileName}_${suffix}${path.extname(inputFile)}`);

              await AudioProcessor.addFadeEffects({
                inputPath: inputFile,
                outputPath,
                fadeInDuration: values.fadeInDuration ? Number(values.fadeInDuration) : undefined,
                fadeOutDuration: values.fadeOutDuration ? Number(values.fadeOutDuration) : undefined,
              });
              break;
            }

            case "normalize": {
              suffix = "normalized";
              outputPath = path.join(values.outputDirectory[0], `${fileName}_${suffix}${path.extname(inputFile)}`);

              await AudioProcessor.normalizeAudio({
                inputPath: inputFile,
                outputPath,
                targetLevel: values.targetLevel ? Number(values.targetLevel) : -23,
              });
              break;
            }

            case "volume": {
              const volumeChange = values.volumeChange ? Number(values.volumeChange) : 0;
              const volumeSuffix = volumeChange >= 0 ? `plus${volumeChange}dB` : `minus${Math.abs(volumeChange)}dB`;
              suffix = `volume_${volumeSuffix}`;
              outputPath = path.join(values.outputDirectory[0], `${fileName}_${suffix}${path.extname(inputFile)}`);

              await AudioProcessor.adjustVolume({
                inputPath: inputFile,
                outputPath,
                volumeChange,
                useGain: values.useGain || false,
              });
              break;
            }

            case "stereo-to-mono": {
              const methodSuffix = values.mixMethod === "mix" ? "mono" : `mono_${values.mixMethod}`;
              suffix = methodSuffix;
              outputPath = path.join(values.outputDirectory[0], `${fileName}_${suffix}${path.extname(inputFile)}`);

              await AudioProcessor.convertStereoToMono({
                inputPath: inputFile,
                outputPath,
                mixMethod: values.mixMethod as "mix" | "left" | "right",
              });
              break;
            }

            case "speed": {
              const speedPercentage = values.speedPercentage ? Number(values.speedPercentage) : 100;
              const speedSuffix = `speed_${speedPercentage}percent${values.preservePitch ? "_pitched" : ""}`;
              suffix = speedSuffix;
              outputPath = path.join(values.outputDirectory[0], `${fileName}_${suffix}${path.extname(inputFile)}`);

              await AudioProcessor.adjustSpeed({
                inputPath: inputFile,
                outputPath,
                speedPercentage,
                preservePitch: values.preservePitch || false,
              });
              break;
            }

            default:
              throw new Error(`Unknown operation: ${values.operation}`);
          }

          results.push({ success: true, file: path.basename(inputFile) });
        } catch (error) {
          results.push({
            success: false,
            file: path.basename(inputFile),
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }

        processedFiles++;
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      showToast({
        style: successCount === totalFiles ? Toast.Style.Success : Toast.Style.Failure,
        title: "Batch Processing Complete",
        message: `${successCount} succeeded, ${failureCount} failed`,
        primaryAction: {
          title: "Show Output Folder",
          onAction: () => showInFinder(values.outputDirectory[0]),
        },
      });

      if (failureCount > 0) {
        const failedFiles = results.filter((r) => !r.success);
        console.log("Failed files:", failedFiles);
      }

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Batch Processing Failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Batch Processing" onSubmit={handleSubmit} />
          <Action title="Refresh Selected Files" onAction={loadSelectedFiles} />
        </ActionPanel>
      }
    >
      {progress && (
        <Form.Description text={`Processing ${progress.current} of ${progress.total}: ${progress.currentFile}`} />
      )}

      <Form.TextArea
        id="inputFiles"
        title={`Selected Files (${selectedFiles.length})`}
        value={selectedFiles.map((file) => path.basename(file)).join("\n")}
        onChange={() => {}}
      />

      <Form.Dropdown id="operation" title="Processing Operation" defaultValue="convert">
        <Form.Dropdown.Item value="convert" title="Convert Format" />
        <Form.Dropdown.Item value="trim" title="Trim Silence" />
        <Form.Dropdown.Item value="fade" title="Add Fade Effects" />
        <Form.Dropdown.Item value="normalize" title="Normalize Audio" />
        <Form.Dropdown.Item value="volume" title="Adjust Volume/Gain" />
        <Form.Dropdown.Item value="stereo-to-mono" title="Convert Stereo to Mono" />
        <Form.Dropdown.Item value="speed" title="Adjust Audio Speed" />
      </Form.Dropdown>

      <Form.Dropdown id="outputFormat" title="Output Format (for conversion)" defaultValue="mp3">
        {SUPPORTED_AUDIO_FORMATS.map((format) => (
          <Form.Dropdown.Item key={format} value={format} title={format.toUpperCase()} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="bitrate" title="Bitrate (for conversion)" defaultValue="192k">
        {AUDIO_BITRATES.map((bitrate) => (
          <Form.Dropdown.Item key={bitrate} value={bitrate} title={bitrate} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="startThreshold" title="Start Silence Threshold (for trimming)" placeholder="-50" />

      <Form.TextField id="endThreshold" title="End Silence Threshold (for trimming)" placeholder="-50" />

      <Form.TextField id="fadeInDuration" title="Fade In Duration (for fade effects)" placeholder="2" />

      <Form.TextField id="fadeOutDuration" title="Fade Out Duration (for fade effects)" placeholder="2" />

      <Form.Dropdown id="targetLevel" title="Target Level (for normalization)" defaultValue="-23">
        <Form.Dropdown.Item value="-16" title="-16 LUFS (Streaming)" />
        <Form.Dropdown.Item value="-23" title="-23 LUFS (Broadcast)" />
        <Form.Dropdown.Item value="-14" title="-14 LUFS (Spotify)" />
      </Form.Dropdown>

      <Form.Dropdown id="volumeChange" title="Volume Change (for volume adjustment)" defaultValue="0">
        <Form.Dropdown.Item value="-12" title="-12dB (Quieter)" />
        <Form.Dropdown.Item value="-6" title="-6dB (Moderately Quieter)" />
        <Form.Dropdown.Item value="-3" title="-3dB (Slightly Quieter)" />
        <Form.Dropdown.Item value="0" title="0dB (No Change)" />
        <Form.Dropdown.Item value="3" title="+3dB (Slightly Louder)" />
        <Form.Dropdown.Item value="6" title="+6dB (Moderately Louder)" />
        <Form.Dropdown.Item value="12" title="+12dB (Louder)" />
      </Form.Dropdown>

      <Form.Checkbox
        id="useGain"
        title="Use Precision Mode (for volume adjustment)"
        label="Enable high-precision gain processing"
        defaultValue={false}
      />

      <Form.Dropdown id="mixMethod" title="Mix Method (for stereo to mono)" defaultValue="mix">
        <Form.Dropdown.Item value="mix" title="Mix Both Channels" />
        <Form.Dropdown.Item value="left" title="Use Left Channel Only" />
        <Form.Dropdown.Item value="right" title="Use Right Channel Only" />
      </Form.Dropdown>

      <Form.Dropdown id="speedPercentage" title="Speed (for speed adjustment)" defaultValue="100">
        <Form.Dropdown.Item value="50" title="50% (Half Speed)" />
        <Form.Dropdown.Item value="75" title="75% (Slower)" />
        <Form.Dropdown.Item value="100" title="100% (Normal)" />
        <Form.Dropdown.Item value="125" title="125% (Faster)" />
        <Form.Dropdown.Item value="150" title="150% (1.5x Speed)" />
        <Form.Dropdown.Item value="200" title="200% (Double Speed)" />
      </Form.Dropdown>

      <Form.Checkbox
        id="preservePitch"
        title="Preserve Pitch (for speed adjustment)"
        label="Maintain original pitch while changing speed"
        defaultValue={true}
      />

      <Form.FilePicker
        id="outputDirectory"
        title="Output Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />

      <Form.Description
        text="Process multiple audio files at once with the same operation. Select audio files in Finder, choose your processing operation and settings, then specify an output directory. All processed files will be saved with descriptive suffixes. 

Available operations:
• Format conversion with quality settings
• Silence trimming and fade effects  
• Volume/gain adjustment and normalization
• Stereo to mono conversion with channel options
• Speed adjustment with pitch preservation

Perfect for processing entire music collections, podcast episodes, or audio libraries with consistent settings."
      />
    </Form>
  );
}
