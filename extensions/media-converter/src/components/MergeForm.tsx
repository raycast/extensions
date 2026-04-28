import { Form, ActionPanel, Action, Icon, showToast, Toast, showInFinder, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useMemo, useRef } from "react";
import fs from "fs";
import path from "path";
import { mergeMedia } from "../utils/merge";
import { formatTimeString } from "../utils/time";
import {
  OUTPUT_VIDEO_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  type AllOutputExtension,
  type MediaType,
  getMediaType,
} from "../types/media";

export function MergeForm({ initialFiles = [] }: { initialFiles?: string[] }) {
  const preferences = getPreferenceValues<Preferences>();
  const initialFilesKey = initialFiles.join("\0");
  const [files, setFiles] = useState<string[]>(initialFiles);
  const [outputFormat, setOutputFormat] = useState<AllOutputExtension>(".mp4");
  const [outputFileName, setOutputFileName] = useState<string>("merged");
  const [outputLocationMode, setOutputLocationMode] = useState<"sameAsFirst" | "customFolder" | "thisRun">(
    (preferences.defaultOutputLocation as "sameAsInput" | "customFolder") === "customFolder"
      ? "customFolder"
      : "sameAsFirst",
  );
  const [customOutputFolderOverride, setCustomOutputFolderOverride] = useState<string>("");
  const [stripMetadata, setStripMetadata] = useState<boolean>(Boolean(preferences.defaultStripMetadata));
  const [forceReencode, setForceReencode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const appliedInitialFilesKey = useRef<string | null>(null);
  const hasUserSelectedFiles = useRef(false);

  const mediaType: MediaType | null = useMemo(() => {
    if (files.length === 0) return null;
    const t = getMediaType(path.extname(files[0]));
    return t === "image" ? null : t; // merging images doesn't really make sense
  }, [files]);

  useEffect(() => {
    if (initialFiles.length === 0) {
      if (appliedInitialFilesKey.current === null) {
        appliedInitialFilesKey.current = initialFilesKey;
        setFiles([]);
      }
      return;
    }

    if (hasUserSelectedFiles.current || appliedInitialFilesKey.current === initialFilesKey) {
      return;
    }

    appliedInitialFilesKey.current = initialFilesKey;
    setFiles(initialFiles);
  }, [initialFilesKey]);

  useEffect(() => {
    if (
      mediaType === "audio" &&
      !OUTPUT_AUDIO_EXTENSIONS.includes(outputFormat as (typeof OUTPUT_AUDIO_EXTENSIONS)[number])
    ) {
      setOutputFormat(".mp3");
    } else if (
      mediaType === "video" &&
      !OUTPUT_VIDEO_EXTENSIONS.includes(outputFormat as (typeof OUTPUT_VIDEO_EXTENSIONS)[number])
    ) {
      setOutputFormat(".mp4");
    }
  }, [mediaType]);

  const resolvedOutputDir = useMemo<string | undefined>(() => {
    if (outputLocationMode === "thisRun") return customOutputFolderOverride.trim() || undefined;
    if (outputLocationMode === "customFolder") {
      const configured = (preferences.customOutputFolder as string | undefined)?.trim();
      return configured || undefined;
    }
    return files[0] ? path.dirname(files[0]) : undefined;
  }, [outputLocationMode, customOutputFolderOverride, preferences.customOutputFolder, files]);

  const validationHint = useMemo(() => {
    if (files.length === 0) return "Select at least 2 files of the same type (video or audio).";
    if (files.length === 1) return "Select at least one more file to merge.";
    const types = new Set(files.map((f) => getMediaType(path.extname(f))));
    types.delete(null as unknown as MediaType);
    if (types.has("image")) return "Image files cannot be merged. Please select only video or audio files.";
    if (types.size > 1) return "All files must be the same type (all video or all audio).";
    return "";
  }, [files]);

  const handleSubmit = async () => {
    if (validationHint) {
      await showToast({ style: Toast.Style.Failure, title: "Cannot merge", message: validationHint });
      return;
    }
    if (!outputFileName.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Output filename is required" });
      return;
    }

    if (resolvedOutputDir) {
      try {
        const stat = fs.statSync(resolvedOutputDir);
        if (!stat.isDirectory()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Output folder is not a directory",
            message: resolvedOutputDir,
          });
          return;
        }
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Output folder does not exist",
          message: resolvedOutputDir,
        });
        return;
      }
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Merging ${files.length} files…`,
    });
    try {
      const result = await mergeMedia(files, outputFormat, {
        outputDir: resolvedOutputDir,
        stripMetadata,
        outputFileName: outputFileName.trim(),
        forceReencode,
        onProgress: (p) => {
          const pct = Math.floor(p.percent);
          const eta = p.etaSec !== undefined ? ` · ETA ${formatTimeString(p.etaSec)}` : "";
          toast.title = `Merging · ${pct}%${eta}`;
        },
      });
      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Merged successfully!",
        message: `${path.basename(result.outputPath)} · ${result.strategy === "stream-copy" ? "stream copy" : "re-encoded"}`,
        primaryAction: {
          title: "Open File",
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction: () => showInFinder(result.outputPath),
        },
      });
    } catch (error) {
      await toast.hide();
      showFailureToast(error, { title: "Merge failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const availableFormats: readonly AllOutputExtension[] =
    mediaType === "audio" ? OUTPUT_AUDIO_EXTENSIONS : OUTPUT_VIDEO_EXTENSIONS;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Merge" icon={Icon.Link} onSubmit={handleSubmit} />
          <Action
            title="Reorder: Move First Selected File up"
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
            onAction={() => {
              if (files.length < 2) return;
              setFiles([files[files.length - 1], ...files.slice(0, -1)]);
            }}
          />
          <Action
            title="Reorder: Move First File Down"
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
            onAction={() => {
              if (files.length < 2) return;
              setFiles([...files.slice(1), files[0]]);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Merge Media"
        text="Concatenate multiple video OR multiple audio files into a single output. Inputs are concatenated in the order shown below."
      />
      <Form.FilePicker
        id="files"
        title="Select files to merge"
        allowMultipleSelection={true}
        value={files}
        onChange={(nextFiles) => {
          hasUserSelectedFiles.current = true;
          setFiles(nextFiles);
        }}
      />
      {files.length > 0 && (
        <Form.Description
          text={
            "Merge order:\n" +
            files.map((f, i) => `  ${i + 1}. ${path.basename(f)}`).join("\n") +
            "\n\nTip: Cmd+↑ / Cmd+↓ in Actions rotates the order."
          }
        />
      )}
      {validationHint && <Form.Description text={validationHint} />}
      <Form.Dropdown
        id="outputFormat"
        title="Output Format"
        value={outputFormat}
        onChange={(v) => setOutputFormat(v as AllOutputExtension)}
      >
        {availableFormats.map((f) => (
          <Form.Dropdown.Item key={f} value={f} title={f} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="outputFileName"
        title="Output Filename"
        value={outputFileName}
        onChange={setOutputFileName}
        placeholder="merged"
      />
      <Form.Checkbox
        id="forceReencode"
        title="Encoding"
        label="Always re-encode (skip stream-copy detection)"
        value={forceReencode}
        onChange={setForceReencode}
        info="Stream-copy is much faster but only works when all inputs share codec, resolution, fps, etc. Turn this on for slower-but-guaranteed compatibility."
      />
      <Form.Separator />
      <Form.Dropdown
        id="outputLocation"
        title="Save to"
        value={outputLocationMode}
        onChange={(v) => setOutputLocationMode(v as typeof outputLocationMode)}
      >
        <Form.Dropdown.Item value="sameAsFirst" title="Same folder as first input" />
        <Form.Dropdown.Item
          value="customFolder"
          title={
            preferences.customOutputFolder
              ? `Preference folder (${preferences.customOutputFolder})`
              : "Preference folder (not set)"
          }
        />
        <Form.Dropdown.Item value="thisRun" title="Choose for this run…" />
      </Form.Dropdown>
      {outputLocationMode === "thisRun" && (
        <Form.TextField
          id="customOutputFolderOverride"
          title="Output folder"
          placeholder="/absolute/path/to/folder"
          value={customOutputFolderOverride}
          onChange={setCustomOutputFolderOverride}
        />
      )}
      <Form.Checkbox
        id="stripMetadata"
        title="Privacy"
        label="Strip metadata (EXIF, GPS, tags)"
        value={stripMetadata}
        onChange={setStripMetadata}
      />
    </Form>
  );
}
