import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  showHUD,
  open,
  Clipboard,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import { stat } from "fs/promises";
import { resolveVideoFile, isSupportedVideo, getUnsupportedExtension } from "./lib/file-resolver";
import { getVideoMetadata, formatFileSize, formatDuration, getOutputPath } from "./lib/video-utils";
import { convertToGif } from "./lib/ffmpeg";
import { addHistoryEntry, getHistory } from "./lib/history";
import { estimateGifSize, calculateHeight } from "./lib/estimate";
import {
  Preferences,
  ConversionSettings,
  VideoMetadata,
  HistoryEntry,
  SUPPORTED_EXTENSIONS,
  WIDTH_PRESETS,
  SPEED_PRESETS,
} from "./types";

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const threshold = parseInt(prefs.longVideoThreshold || "30", 10);

  // Form state
  const [filePath, setFilePath] = useState<string[]>([]);
  const [quality, setQuality] = useState(prefs.defaultQuality || "80");
  const [maxWidth, setMaxWidth] = useState(prefs.defaultMaxWidth || "640");
  const [fps, setFps] = useState(prefs.defaultFps || "15");
  const [speed, setSpeed] = useState("1");
  const [loopMode, setLoopMode] = useState(prefs.defaultLoopMode || "loop");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [trimStart, setTrimStart] = useState("00:00");
  const [trimEnd, setTrimEnd] = useState("00:00");

  // Derived state
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<string>("—");
  const [isConverting, setIsConverting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [fileError, setFileError] = useState<string | undefined>();

  // Load history
  useEffect(() => {
    getHistory()
      .then(setHistory)
      .catch((err) => console.error("Failed to load history:", err));
  }, []);

  // Auto-resolve file on mount
  useEffect(() => {
    resolveVideoFile()
      .then((resolved) => {
        if (resolved) {
          setFilePath([resolved]);
        }
      })
      .catch((err) => console.error("Failed to auto-resolve video file:", err));
  }, []);

  // Load metadata when file changes
  useEffect(() => {
    const file = filePath[0];
    if (!file) {
      setMetadata(null);
      setFileError(undefined);
      return;
    }

    if (!isSupportedVideo(file)) {
      const ext = getUnsupportedExtension(file);
      setFileError(`Unsupported format "${ext}". Use: ${SUPPORTED_EXTENSIONS.join(", ")}`);
      setMetadata(null);
      return;
    }

    setFileError(undefined);
    getVideoMetadata(file)
      .then((meta) => {
        setMetadata(meta);
        setTrimEnd(formatDuration(meta.duration));

        // Auto-show advanced if video is long
        if (meta.duration > threshold) {
          setShowAdvanced(true);
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Could not read video metadata";
        console.error("getVideoMetadata failed:", error);
        setFileError(message);
        setMetadata(null);
      });
  }, [filePath, threshold]);

  // Update estimated size when settings change
  useEffect(() => {
    if (!metadata) {
      setEstimatedSize("—");
      return;
    }

    const qualityNum = parseInt(quality, 10) || 80;
    const fpsNum = parseInt(fps, 10) || 15;
    const speedNum = parseFloat(speed) || 1;

    let widthNum = metadata.width;
    if (maxWidth !== "original") {
      widthNum = Math.min(parseInt(maxWidth, 10), metadata.width);
    }
    const heightNum = calculateHeight(metadata.width, metadata.height, widthNum);

    // Use trim duration if set
    let duration = metadata.duration;
    if (showAdvanced) {
      const startParts = trimStart.split(":").map(Number);
      const endParts = trimEnd.split(":").map(Number);
      const startSec = startParts.length === 2 ? startParts[0] * 60 + startParts[1] : 0;
      const endSec = endParts.length === 2 ? endParts[0] * 60 + endParts[1] : metadata.duration;
      duration = Math.max(0, endSec - startSec);
    }

    const estimated = estimateGifSize({
      width: widthNum,
      height: heightNum,
      fps: fpsNum,
      durationSeconds: duration,
      quality: qualityNum,
      speed: speedNum,
    });

    setEstimatedSize(`~${formatFileSize(estimated)}`);
  }, [metadata, quality, maxWidth, fps, speed, showAdvanced, trimStart, trimEnd]);

  async function handleSubmit() {
    const file = filePath[0];
    if (!file || !metadata) {
      await showToast({ style: Toast.Style.Failure, title: "No Video Selected" });
      return;
    }

    setIsConverting(true);

    const settings: ConversionSettings = {
      inputPath: file,
      quality: Math.max(1, Math.min(100, parseInt(quality, 10) || 80)),
      maxWidth,
      fps: Math.max(1, Math.min(50, parseInt(fps, 10) || 15)),
      speed: parseFloat(speed) || 1,
      loopMode: loopMode as "loop" | "none",
      trimStart: showAdvanced ? trimStart : undefined,
      trimEnd: showAdvanced ? trimEnd : undefined,
    };

    const outputFolder = prefs.outputFolder || `${homedir()}/Desktop`;
    const outputPath = getOutputPath(file, outputFolder);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Converting to GIF…",
      message: "0%",
    });

    try {
      await convertToGif(settings, outputPath, metadata.duration, (progress) => {
        const remaining = Math.ceil(progress.estimatedRemainingMs / 1000);
        toast.message = `${progress.percentage}%${remaining > 0 ? ` (~${remaining}s remaining)` : ""}`;
      });

      const outputStat = await stat(outputPath);
      const sizeStr = formatFileSize(outputStat.size);
      const fileName = outputPath.split("/").pop() || "output.gif";

      try {
        await addHistoryEntry({
          id: Date.now().toString(),
          inputPath: file,
          outputPath,
          fileSize: outputStat.size,
          createdAt: new Date().toISOString(),
          settings,
        });

        const updatedHistory = await getHistory();
        setHistory(updatedHistory);
      } catch (historyError) {
        console.error("Failed to save history entry:", historyError);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "GIF Created",
        message: `${fileName} — ${sizeStr}`,
        primaryAction: {
          title: "Reveal in Finder",
          onAction: () => {
            open(outputPath, "com.apple.Finder");
          },
        },
        secondaryAction: {
          title: "Copy to Clipboard",
          onAction: async () => {
            await Clipboard.copy({ file: outputPath });
            await showHUD("GIF copied to clipboard");
          },
        },
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion Failed",
        message: error instanceof Error ? error.message : "FFmpeg encountered an error",
      });
    } finally {
      setIsConverting(false);
    }
  }

  const metadataDescription = metadata
    ? `${formatDuration(metadata.duration)} • ${metadata.width}×${metadata.height} • ${formatFileSize(metadata.fileSize)}`
    : undefined;

  return (
    <Form
      isLoading={isConverting}
      navigationTitle={metadata ? filePath[0]?.split("/").pop() : "Convert to GIF"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert to Gif" icon={Icon.Image} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Video File"
        value={filePath}
        onChange={setFilePath}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        error={fileError}
      />

      {metadataDescription && <Form.Description title="Video Info" text={metadataDescription} />}

      <Form.Separator />

      <Form.TextField
        id="quality"
        title="Quality"
        placeholder="1–100"
        value={quality}
        onChange={setQuality}
        info="Higher quality = larger file size. 80 is a good balance."
      />

      <Form.Dropdown id="maxWidth" title="Max Width" value={maxWidth} onChange={setMaxWidth}>
        {WIDTH_PRESETS.map((preset) => (
          <Form.Dropdown.Item key={preset.value} title={preset.title} value={preset.value} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="fps"
        title="FPS"
        placeholder="1–50"
        value={fps}
        onChange={setFps}
        info="Frames per second. 15 is standard for GIFs. Higher = smoother but larger."
      />

      <Form.Checkbox id="showAdvanced" label="Show Advanced Settings" value={showAdvanced} onChange={setShowAdvanced} />

      {showAdvanced && (
        <>
          <Form.Separator />

          <Form.Dropdown id="speed" title="Speed" value={speed} onChange={setSpeed}>
            {SPEED_PRESETS.map((preset) => (
              <Form.Dropdown.Item key={preset.value} title={preset.title} value={preset.value} />
            ))}
          </Form.Dropdown>

          <Form.Dropdown id="loopMode" title="Loop Mode" value={loopMode} onChange={(val) => setLoopMode(val as "loop" | "none")}>
            <Form.Dropdown.Item title="Loop Forever" value="loop" />
            <Form.Dropdown.Item title="No Loop" value="none" />
          </Form.Dropdown>

          <Form.TextField
            id="trimStart"
            title="Trim Start"
            placeholder="00:00"
            value={trimStart}
            onChange={setTrimStart}
            info="Start time in MM:SS format"
          />

          <Form.TextField
            id="trimEnd"
            title="Trim End"
            placeholder="00:00"
            value={trimEnd}
            onChange={setTrimEnd}
            info="End time in MM:SS format"
          />
        </>
      )}

      <Form.Separator />

      <Form.Description title="Estimated Size" text={estimatedSize} />

      {history.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description title="Recent Conversions" text="" />
          {history.map((entry) => {
            const name = entry.outputPath.split("/").pop() || "unknown.gif";
            const size = formatFileSize(entry.fileSize);
            const date = new Date(entry.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            return <Form.Description key={entry.id} title="" text={`${name}  —  ${size}  —  ${date}`} />;
          })}
        </>
      )}
    </Form>
  );
}
