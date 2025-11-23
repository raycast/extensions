import { Action, ActionPanel, Detail, Clipboard, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useUpload } from "../hooks/use-upload";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink } from "fs/promises";

type ClipboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      filePath: string;
      description: string;
      originalFileName?: string;
      cleanup?: () => Promise<void>;
    };

export default function UploadFromClipboardCommand() {
  const { upload, preferences } = useUpload();
  const [state, setState] = useState<ClipboardState>({ status: "loading" });

  useEffect(() => {
    void detectClipboard()
      .then(setState)
      .catch((error) => setState({ status: "error", message: (error as Error).message }));
  }, []);

  const handleUpload = async () => {
    if (state.status !== "ready") {
      return;
    }
    try {
      await upload({
        filePath: state.filePath,
        channel: preferences.uploadChannel,
        folder: preferences.uploadFolder,
        nameType: preferences.uploadNameType ?? "default",
        returnFormat: preferences.returnFormat ?? "default",
        serverCompress: preferences.serverCompress ?? true,
        autoRetry: preferences.autoRetry ?? true,
        fileName: state.originalFileName,
      });
      await showToast(Toast.Style.Success, "Uploaded successfully");
    } finally {
      await state.cleanup?.();
    }
  };

  const markdown =
    state.status === "loading"
      ? "Reading clipboard..."
      : state.status === "error"
        ? `**No uploadable image detected**\n\n${state.message}`
        : `Detected: \`${state.description}\`\n\nFile path: \`${state.filePath}\``;

  return (
    <Detail
      isLoading={state.status === "loading"}
      markdown={markdown}
      actions={
        <ActionPanel>
          {state.status === "ready" && <Action title="Upload Clipboard Image" onAction={() => void handleUpload()} />}
        </ActionPanel>
      }
    />
  );
}

async function detectClipboard(): Promise<ClipboardState> {
  const content = await Clipboard.read();
  if (content.file) {
    return {
      status: "ready",
      filePath: content.file,
      description: "Clipboard file",
      originalFileName:
        content.text?.trim() && looksLikeImageUrl(content.text.trim())
          ? extractFileNameFromUrl(content.text.trim())
          : content.file.split("/").pop(),
    };
  }

  const text = content.text?.trim();
  if (text && looksLikeImageUrl(text)) {
    const tempPath = await downloadImage(text);
    return {
      status: "ready",
      filePath: tempPath,
      description: `Remote image: ${text}`,
      originalFileName: extractFileNameFromUrl(text),
      cleanup: async () => {
        await unlink(tempPath);
      },
    };
  }

  throw new Error("No image or image link found in the clipboard");
}

function looksLikeImageUrl(rawText: string) {
  const trimmed = rawText.trim();
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }
    const pathname = url.pathname.toLowerCase();
    return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".ico", ".svg"].some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

function extractFileNameFromUrl(urlStr: string | undefined) {
  if (!urlStr) return undefined;
  try {
    const url = new URL(urlStr);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.pop();
  } catch {
    return undefined;
  }
}

async function downloadImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to download image");
  }
  const arrayBuffer = await response.arrayBuffer();
  const tempPath = join(tmpdir(), `imgbed-${randomUUID()}.png`);
  await writeFile(tempPath, Buffer.from(arrayBuffer));
  return tempPath;
}
