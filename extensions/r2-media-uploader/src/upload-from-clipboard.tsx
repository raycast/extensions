import fs from "node:fs/promises";
import path from "node:path";
import { Clipboard, Form, environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
import { UploadForm } from "./components/UploadForm";
import { ToastError } from "./components/ToastError";
import { buildBucketOptions, buildDomainOptions } from "./lib/options";
import { loadPreferences } from "./lib/prefs";
import type { UploadSource } from "./lib/upload";

type ClipboardResolved = { source: UploadSource; label: string } | null;

async function tryWriteClipboardImageToSupportFile(): Promise<string | null> {
  if (process.platform !== "darwin") return null;

  const outPath = path.join(
    environment.supportPath,
    `clipboard-${Date.now()}-${Math.random().toString(16).slice(2)}.png`,
  );
  await fs.mkdir(environment.supportPath, { recursive: true });

  const script = `
on run argv
  set outPath to item 1 of argv
  try
    set imgData to (the clipboard as «class PNGf»)
  on error
    return ""
  end try
  set outFile to open for access (POSIX file outPath) with write permission
  try
    set eof outFile to 0
    write imgData to outFile
  end try
  try
    close access outFile
  end try
  return outPath
end run
`;

  const result = (await runAppleScript(script, [outPath])).trim();
  if (!result) return null;
  return outPath;
}

async function readClipboardSource(): Promise<ClipboardResolved> {
  // Prefer image data if present (via AppleScript, for broad Raycast API compatibility)
  const imagePath = await tryWriteClipboardImageToSupportFile();
  if (imagePath) {
    return { source: { kind: "file-path", filePath: imagePath }, label: "clipboard image" };
  }

  // Fallback: if clipboard contains a file path (e.g. copied file in Finder), upload that
  const content = (await Clipboard.read()) as unknown as { file?: string };
  const filePath = content?.file;
  if (filePath) {
    return { source: { kind: "file-path", filePath }, label: "clipboard file" };
  }

  return null;
}

export default function Command() {
  const { prefs, profiles } = loadPreferences();
  const [resolved, setResolved] = useState<ClipboardResolved | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await readClipboardSource();
        setResolved(r);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  const bucketOptions = buildBucketOptions({ profiles, prefs });
  const domainOptions = buildDomainOptions({ profiles, prefs });

  if (!bucketOptions.length) {
    return (
      <ToastError
        title="No buckets configured"
        message="Add Bucket Names or Bucket Profiles (JSON) in Extension Preferences."
        openPreferences
      />
    );
  }
  if (loadError) {
    return <ToastError title="Can't read clipboard" message={loadError} />;
  }
  if (resolved === undefined) {
    return <Form isLoading navigationTitle="Upload from Clipboard" />;
  }
  if (resolved === null) {
    return (
      <ToastError
        title="No image or file in clipboard"
        message="Copy an image, or copy a file in Finder (e.g. a video), then run again."
      />
    );
  }

  const title = "Upload from Clipboard";

  // Always show the form (bucket + domain), per request.
  return (
    <UploadForm
      title={title}
      prefs={prefs}
      bucketOptions={bucketOptions}
      domainOptions={domainOptions}
      sources={[resolved.source]}
    />
  );
}
