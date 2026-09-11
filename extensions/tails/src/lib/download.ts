import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Transform } from "node:stream";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { formatBytes } from "./format";
import { getPreferences } from "./preferences";
import type { StreamFile } from "./types";

function resolveDownloadDir(): string {
  const { downloadDirectory } = getPreferences();
  return downloadDirectory.replace(/^~/, homedir());
}

function sanitizeFilename(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 200);
}

export async function downloadFile(
  stream: StreamFile,
  subfolder?: string,
  onProgress?: (downloaded: number, total: number | null) => void,
): Promise<string> {
  const baseDir = resolveDownloadDir();
  const targetDir = subfolder ? join(baseDir, sanitizeFilename(subfolder)) : baseDir;

  await mkdir(targetDir, { recursive: true });

  const filePath = join(targetDir, sanitizeFilename(stream.fileName));
  const res = await fetch(stream.url);

  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status}`);
  }

  const contentLength = res.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : null;
  let downloaded = 0;

  const progress = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      downloaded += chunk.length;
      onProgress?.(downloaded, total);
      callback(null, chunk);
    },
  });

  const readable = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
  await pipeline(readable, progress, createWriteStream(filePath));

  return filePath;
}

export interface BatchDownloadResult {
  paths: string[];
  failed: number;
}

export async function downloadAll(files: StreamFile[], subfolder?: string): Promise<BatchDownloadResult> {
  const paths: string[] = [];
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Downloading ${i + 1}/${files.length}`,
      message: file.fileName,
    });

    try {
      const path = await downloadFile(file, subfolder, (downloaded, total) => {
        if (total && total > 0) {
          const pct = Math.floor((downloaded / total) * 100);
          toast.message = `${pct}% · ${formatBytes(downloaded)} / ${formatBytes(total)}`;
        } else {
          toast.message = formatBytes(downloaded);
        }
      });
      paths.push(path);
    } catch {
      failed++;
    }
  }

  if (paths.length > 0) {
    const firstPath = paths[0];
    const fileName = firstPath.split(/[/\\]/).pop() ?? "file";

    await showToast({
      style: Toast.Style.Success,
      title: paths.length === 1 ? `Downloaded ${fileName}` : `Downloaded ${paths.length} file(s)`,
      primaryAction: {
        title: "Show File",
        onAction: async () => {
          const { showInFinder } = await import("@raycast/api");
          await showInFinder(firstPath);
        },
      },
      secondaryAction: {
        title: "Copy File",
        onAction: async () => {
          await Clipboard.copy({ file: firstPath });
          await showHUD("Copied file to clipboard");
        },
      },
    });
  }

  if (failed > 0 && paths.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: `All ${failed} download(s) failed`,
    });
  } else if (failed > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${failed} of ${files.length} download(s) failed`,
    });
  }

  return { paths, failed };
}
