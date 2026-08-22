import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  Clipboard,
  open,
  Icon,
  useNavigation,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import { compressFile, QualityMode, CompressionResult, getDetectedFileInfo, DetectedFileInfo } from "./engines";
import { formatBytes, calculateCompressionRatio } from "./utils/format";
import { getActiveFileManagerSelectedFile, revealInFileManager } from "./utils/system";

interface FormValues {
  files: string[];
  targetMB: string;
  preset: string;
  qualityMode: QualityMode;
}

export default function CompressFileCommand() {
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [fileInfo, setFileInfo] = useState<DetectedFileInfo | null>(null);
  const [targetMB, setTargetMB] = useState<string>("20");
  const [qualityMode, setQualityMode] = useState<QualityMode>("smart_auto");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { push } = useNavigation();

  const fileManagerName = process.platform === "win32" ? "Explorer" : "Finder";

  // Try to detect selected file in active file manager (Windows Explorer or macOS Finder) on mount
  useEffect(() => {
    async function detectActiveFile() {
      try {
        const activeFile = await getActiveFileManagerSelectedFile();
        if (activeFile && fs.existsSync(activeFile)) {
          setSelectedFile(activeFile);
          const info = getDetectedFileInfo(activeFile);
          setFileInfo(info);
          showToast({
            style: Toast.Style.Success,
            title: "File Detected",
            message: info?.name || activeFile,
          });
        }
      } catch {
        // Ignore detection failure
      }
    }
    detectActiveFile();
  }, []);

  const handleFileChange = (paths: string[]) => {
    if (paths && paths.length > 0) {
      const p = paths[0];
      setSelectedFile(p);
      setFileInfo(getDetectedFileInfo(p));
    } else {
      setSelectedFile("");
      setFileInfo(null);
    }
  };

  const handlePresetChange = (value: string) => {
    if (value !== "custom") {
      setTargetMB(value);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    if (isLoading) return;

    const inputPath = values.files && values.files.length > 0 ? values.files[0] : selectedFile;

    if (!inputPath || !fs.existsSync(inputPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No File Selected",
        message: `Please select a valid file from ${fileManagerName} or the file picker.`,
      });
      return;
    }

    const rawTargetStr = (values.targetMB || targetMB || "").trim().replace(",", ".");
    const targetNum = parseFloat(rawTargetStr);
    if (isNaN(targetNum) || targetNum <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Target Size",
        message: "Please enter a valid target size in MB (e.g. 20 or 8.5).",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Compressing File...",
      message: "Starting engine...",
    });

    try {
      let lastUpdate = 0;
      const res = await compressFile({
        inputPath,
        targetSizeMB: targetNum,
        qualityMode: values.qualityMode || qualityMode,
        onProgress: (progress, stage) => {
          const now = Date.now();
          if (now - lastUpdate > 200 || progress === 100) {
            lastUpdate = now;
            toast.message = `${progress}% - ${stage}`;
          }
        },
      });

      setIsLoading(false);

      const ratio = calculateCompressionRatio(res.originalSizeBytes, res.compressedSizeBytes);

      toast.style = Toast.Style.Success;
      toast.title = "Compression Complete!";
      toast.message = `${formatBytes(res.originalSizeBytes)} -> ${formatBytes(res.compressedSizeBytes)} (-${ratio.savedPercent}%)`;

      toast.primaryAction = {
        title: `Reveal in ${fileManagerName}`,
        onAction: () => revealInFileManager(res.outputPath),
      };

      // Push detailed result view
      push(<CompressionResultView result={res} />);
    } catch (err: unknown) {
      setIsLoading(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.style = Toast.Style.Failure;
      toast.title = "Compression Failed";
      toast.message = errMsg;
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Compression" icon={Icon.Play} onSubmit={handleSubmit} />
          {selectedFile && (
            <Action
              title={`Reveal Selected in ${fileManagerName}`}
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => revealInFileManager(selectedFile)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title="WayCompress"
        text="Compress any video, image, audio, or PDF to an exact target MB size with maximum quality."
      />

      <Form.FilePicker
        id="files"
        title="Select File"
        allowMultipleSelection={false}
        value={selectedFile ? [selectedFile] : []}
        onChange={handleFileChange}
      />

      {fileInfo && (
        <Form.Description
          title="File Information"
          text={`${fileInfo.name} • ${formatBytes(fileInfo.sizeBytes)} • Type: ${fileInfo.category.toUpperCase()}`}
        />
      )}

      <Form.Separator />

      <Form.Dropdown id="preset" title="Quick Presets" defaultValue="20" onChange={handlePresetChange}>
        <Form.Dropdown.Item value="20" title="Discord Free Limit (20 MB)" icon={Icon.Message} />
        <Form.Dropdown.Item value="16" title="WhatsApp Limit (16 MB)" icon={Icon.Phone} />
        <Form.Dropdown.Item value="10" title="Email Attachment (10 MB)" icon={Icon.Envelope} />
        <Form.Dropdown.Item value="8" title="Legacy Discord (8 MB)" icon={Icon.Document} />
        <Form.Dropdown.Item value="50" title="Large Share (50 MB)" icon={Icon.HardDrive} />
        <Form.Dropdown.Item value="100" title="Video Share (100 MB)" icon={Icon.Video} />
        <Form.Dropdown.Item value="custom" title="Custom MB Value..." icon={Icon.Pencil} />
      </Form.Dropdown>

      <Form.TextField
        id="targetMB"
        title="Target Size (MB)"
        placeholder="e.g. 25 or 8.5"
        value={targetMB}
        onChange={setTargetMB}
      />

      <Form.Dropdown
        id="qualityMode"
        title="Quality Strategy"
        value={qualityMode}
        onChange={(val) => setQualityMode(val as QualityMode)}
      >
        <Form.Dropdown.Item
          value="smart_auto"
          title="Smart Balanced (Auto - Protect Resolution & Quality)"
          icon={Icon.Stars}
        />
        <Form.Dropdown.Item
          value="strict_resolution"
          title="Strict Resolution (Never Downscale Dimensions)"
          icon={Icon.Lock}
        />
        <Form.Dropdown.Item
          value="max_quality"
          title="Maximum Compression Efficiency (Modern Formats)"
          icon={Icon.Wand}
        />
      </Form.Dropdown>
    </Form>
  );
}

function CompressionResultView({ result }: { result: CompressionResult }) {
  const ratio = calculateCompressionRatio(result.originalSizeBytes, result.compressedSizeBytes);

  const fileManagerName = process.platform === "win32" ? "Explorer" : "Finder";

  const markdown = `
# Compression Summary

* **Status:** Success
* **Original File:** \`${result.inputPath}\`
* **Compressed File:** \`${result.outputPath}\`

---

### Size Comparison
* **Original Size:** ${formatBytes(result.originalSizeBytes)}
* **Target Size:** ${formatBytes(result.targetSizeBytes)}
* **Compressed Size:** **${formatBytes(result.compressedSizeBytes)}**
* **Space Saved:** **${ratio.savedPercent}%** (${formatBytes(ratio.savedBytes)})

${
  result.resolution
    ? `### Resolution
* **Original:** ${result.resolution.originalWidth || "-"}x${result.resolution.originalHeight || "-"}
* **Output:** ${result.resolution.newWidth || "-"}x${result.resolution.newHeight || "-"}`
    : ""
}

${result.details ? `### Technical Details\n* ${result.details}` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={`Reveal in ${fileManagerName}`}
            icon={Icon.Finder}
            onAction={() => revealInFileManager(result.outputPath)}
          />
          <Action title="Open Compressed File" icon={Icon.Document} onAction={() => open(result.outputPath)} />
          <Action
            title="Copy Output Path"
            icon={Icon.CopyClipboard}
            onAction={async () => {
              await Clipboard.copy(result.outputPath);
              await showToast({
                style: Toast.Style.Success,
                title: "Path Copied to Clipboard",
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
