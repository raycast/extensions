import {
  showToast,
  Toast,
  Clipboard,
  showHUD,
  open,
  getPreferenceValues,
} from "@raycast/api";
import fs from "fs";
import path from "path";

interface ProgressEvent {
  stage: string;
  percent: number;
  step?: number;
  totalSteps?: number;
}

interface VectorizeResult {
  svg: string;
  id?: string;
}

interface ApiError {
  error?: string;
}

const VALID_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".tiff"];

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".tiff": "image/tiff",
};

async function vectorize(
  imageBase64: string,
  apiKey: string,
  onProgress?: (progress: ProgressEvent) => void,
): Promise<VectorizeResult> {
  const response = await fetch("https://svg.new/api/agent/vectorize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ image: imageBase64 }),
  });

  if (!response.ok) {
    const err = (await response.json()) as ApiError;
    throw new Error(err.error || `API error: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/event-stream") && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: VectorizeResult | null = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          if (eventType === "progress" && onProgress) {
            onProgress(data as ProgressEvent);
          } else if (eventType === "result") {
            result = { svg: data.svg, id: data.id };
          } else if (eventType === "error") {
            throw new Error(data.message || "Vectorization failed");
          }
          eventType = "";
        }
      }
    }

    if (!result) throw new Error("No result received from stream");
    return result;
  }

  const data = (await response.json()) as VectorizeResult;
  return data;
}

function formatStage(stage: string): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function fileUrlToPath(fileUrl: string): string {
  try {
    return decodeURIComponent(new URL(fileUrl).pathname);
  } catch {
    return fileUrl.replace("file://", "");
  }
}

export default async function Command() {
  const { apiKey } = getPreferenceValues<{ apiKey: string }>();

  try {
    const clipboard = await Clipboard.read();

    if (!clipboard.file) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No image in clipboard",
        message: "Copy an image first",
      });
      return;
    }

    const filePath = fileUrlToPath(clipboard.file);
    const ext = path.extname(filePath).toLowerCase();

    if (!VALID_EXTS.includes(ext)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unsupported image format",
        message: `Supported: ${VALID_EXTS.join(", ")}`,
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Reading clipboard image...",
    });

    const buffer = fs.readFileSync(filePath);
    const mime = MIME_MAP[ext] || "image/png";
    const base64 = `data:${mime};base64,${buffer.toString("base64")}`;

    const { svg } = await vectorize(base64, apiKey, (progress) => {
      toast.title = `${formatStage(progress.stage)}...`;
      toast.message = `${progress.percent}%`;
    });

    toast.title = "Saving SVG...";
    const outputDir = path.join(process.env.HOME || "/tmp", "Downloads");
    const outputPath = path.join(outputDir, `vectorized-${Date.now()}.svg`);
    fs.writeFileSync(outputPath, svg);

    await Clipboard.copy(svg);

    toast.style = Toast.Style.Success;
    toast.title = "Done";
    toast.message = "SVG saved to Downloads and copied to clipboard";

    await showHUD(`✓ SVG saved to Downloads and copied to clipboard`);
    await open(outputPath);
  } catch (error: unknown) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
