import isImage from "is-image";
import { extname } from "node:path";
import { Prediction } from "../types";
import { isRunning } from "./status";

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v"];
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"];

export type OutputItem = { kind: "image" | "video" | "audio" | "file"; url: string } | { kind: "text"; text: string };

export type FileOutput = Extract<OutputItem, { url: string }>;

const KIND_LABELS: Record<FileOutput["kind"], string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  file: "File",
};

export const kindLabel = (kind: FileOutput["kind"]) => KIND_LABELS[kind];

export const extensionFor = (mediaType?: string | null) =>
  mediaType?.split(";")[0].split("/")[1]?.replace("jpeg", "jpg").replace(/\+.*/, "") || undefined;

// Raycast sizes markdown images through query params, and delivery URLs are already signed.
export const sizedImage = (url: string, width: number) =>
  `${url}${url.includes("?") ? "&" : "?"}raycast-width=${width}`;

export const altText = (prompt: string) =>
  prompt
    .replace(/\s+/g, " ")
    .replace(/[[\]"<>]/g, "")
    .trim()
    .slice(0, 80);

const asUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
};

const classify = (value: unknown): OutputItem | undefined => {
  if (typeof value === "string") {
    const url = asUrl(value);
    if (!url) return { kind: "text", text: value };
    // is-image reads everything past the last dot, so a signed URL's query breaks it.
    const path = url.pathname;
    const extension = extname(path).toLowerCase();
    if (isImage(path)) return { kind: "image", url: value };
    if (VIDEO_EXTENSIONS.includes(extension)) return { kind: "video", url: value };
    if (AUDIO_EXTENSIONS.includes(extension)) return { kind: "audio", url: value };
    // Replicate serves some images from URLs with no extension at all.
    if (!extension) return { kind: "image", url: value };
    return { kind: "file", url: value };
  }
  if (value === null || value === undefined) return undefined;
  return { kind: "text", text: JSON.stringify(value, null, 2) };
};

export const outputItems = (output: Prediction["output"]): OutputItem[] => {
  // Language models stream one array entry per token.
  if (Array.isArray(output) && output.length && output.every((entry) => typeof entry === "string" && !asUrl(entry))) {
    return [{ kind: "text", text: output.join("") }];
  }
  const values = Array.isArray(output) ? output : [output];
  return values.map(classify).filter((item): item is OutputItem => Boolean(item));
};

export const files = (items: OutputItem[]) => items.filter((item): item is FileOutput => "url" in item);

export const firstFile = (items: OutputItem[]) => files(items)[0];

export const firstImage = (items: OutputItem[]) => files(items).find((item) => item.kind === "image")?.url;

export const firstText = (items: OutputItem[]) => items.find((item) => item.kind === "text");

export const previewMarkdown = (prediction: Prediction, items: OutputItem[]) => {
  const image = firstImage(items);
  return image ? `![](${image})` : statusLine(prediction);
};

const statusLine = (prediction: Prediction) => {
  switch (prediction.status) {
    case "starting":
      return "Waiting for the model to start...";
    case "processing":
      return "Running...";
    case "canceled":
      return "This prediction was canceled.";
    case "failed":
      return prediction.error ?? "This prediction failed.";
    default:
      return "Replicate deletes outputs about an hour after they run, and this one wasn't saved on this computer.";
  }
};

const LOG_LINES = 20;

const logTail = (logs?: string | null) => {
  // Progress bars overwrite themselves with carriage returns rather than newlines.
  const lines = (logs ?? "").split(/[\r\n]+/).filter((line) => line.trim());
  if (!lines.length) return undefined;
  return `\`\`\`\n${lines.slice(-LOG_LINES).join("\n")}\n\`\`\``;
};

export const outputMarkdown = (prediction: Prediction, items: OutputItem[]) => {
  const prompt = prediction.input?.prompt?.trim();
  const logs = isRunning(prediction) || prediction.status === "failed" ? logTail(prediction.logs) : undefined;

  if (!items.length) {
    return [statusLine(prediction), logs].filter(Boolean).join("\n\n");
  }

  const body = items
    .map((item) => {
      if (item.kind === "image") return `![${prompt ?? ""}](${item.url})`;
      if (item.kind === "text") return `\`\`\`\n${item.text}\n\`\`\``;
      return `[${item.kind === "file" ? "Open file" : `Play ${item.kind}`}](${item.url})`;
    })
    .join("\n\n");

  return [body, logs].filter(Boolean).join("\n\n");
};
