import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  open,
  Detail,
  getSelectedFinderItems,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import {
  buildOutputPath,
  getCategory,
  getTargetFormats,
  findBinary,
} from "./utils";

const execFileAsync = promisify(execFile);

export default function Command() {
  const [filePath, setFilePath] = useState<string[]>([]);
  const [targetFormat, setTargetFormat] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => {
        if (items.length > 0) {
          setFilePath([items[0].path]);
        }
      })
      .catch(() => undefined);
  }, []);

  const selectedFile = filePath[0] ?? null;
  const ext = selectedFile
    ? path.extname(selectedFile).replace(".", "").toLowerCase()
    : "";
  const category = selectedFile ? getCategory(selectedFile) : "unknown";
  const formats = selectedFile ? getTargetFormats(category, ext) : [];

  async function handleConvert() {
    if (!selectedFile || !targetFormat) return;

    setIsConverting(true);
    setError(null);
    setResultPath(null);

    const outputPath = buildOutputPath(selectedFile, targetFormat);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Converting…" });

      let bin: string;
      let args: string[];

      if (category === "video" || category === "audio") {
        bin = findBinary("ffmpeg");
        args = ["-y", "-i", selectedFile, outputPath];
      } else if (category === "image") {
        bin = findBinary("magick");
        args = [selectedFile, outputPath];
      } else if (category === "document") {
        bin = findBinary("pandoc");
        args = [selectedFile, "-o", outputPath];
      } else {
        throw new Error("Unsupported format");
      }

      await execFileAsync(bin, args, { timeout: 120_000 });

      if (!fs.existsSync(outputPath)) {
        throw new Error("Output file was not created.");
      }

      setResultPath(outputPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Conversion Successful",
        message: path.basename(outputPath),
        primaryAction: {
          title: "Open File",
          onAction: () => open(outputPath),
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: msg,
      });
    } finally {
      setIsConverting(false);
    }
  }

  if (resultPath) {
    return (
      <Detail
        markdown={`## Conversion Successful ✅\n\n**File:** \`${path.basename(resultPath)}\`\n\n**Folder:** \`${path.dirname(resultPath)}\``}
        actions={
          <ActionPanel>
            <Action title="Open File" onAction={() => open(resultPath)} />
            <Action
              title="Open Folder"
              onAction={() => open(path.dirname(resultPath))}
            />
            <Action
              title="New Conversion"
              onAction={() => setResultPath(null)}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isConverting}
      actions={
        <ActionPanel>
          <Action
            title={isConverting ? "Converting…" : "Convert"}
            onAction={handleConvert}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Source File"
        allowMultipleSelection={false}
        value={filePath}
        onChange={(v) => {
          setFilePath(v);
          setTargetFormat("");
          setResultPath(null);
          setError(null);
        }}
      />

      {selectedFile && category === "unknown" && (
        <Form.Description
          title="Unsupported Format"
          text="This file type is not supported. Supported formats: video, audio, image, document."
        />
      )}

      {selectedFile && category !== "unknown" && (
        <>
          <Form.Description
            title="Detected Type"
            text={`${category.charAt(0).toUpperCase() + category.slice(1)} (.${ext})`}
          />
          <Form.Dropdown
            id="format"
            title="Convert To"
            value={targetFormat}
            onChange={setTargetFormat}
          >
            <Form.Dropdown.Item value="" title="— Select a Format —" />
            {formats.map((f) => (
              <Form.Dropdown.Item
                key={f}
                value={f}
                title={`.${f.toUpperCase()}`}
              />
            ))}
          </Form.Dropdown>
        </>
      )}

      {error && <Form.Description title="Error" text={error} />}
    </Form>
  );
}
