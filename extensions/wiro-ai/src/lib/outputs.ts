import type { Task } from "./wiro";

// What a finished task or workflow run produced, as items the result view can
// show: files by kind, and text (an LLM answer or a transcript).

export type OutputKind = "image" | "video" | "audio" | "text" | "file";

export interface ResultItem {
  id: string;
  kind: OutputKind;
  /** The file's address, for file outputs and text files. */
  url?: string;
  /** The text itself, for text outputs that came inline. */
  text?: string;
  /** A file name for the item, used when it is saved. */
  name: string;
  mimeType?: string;
  sizeBytes?: number;
}

const EXTENSION_KINDS: Array<[RegExp, OutputKind]> = [
  [/\.(png|jpe?g|webp|gif|bmp|tiff?|heic|heif|avif|svg)$/i, "image"],
  [/\.(mp4|mov|m4v|webm|mkv|avi)$/i, "video"],
  [/\.(mp3|wav|m4a|aac|flac|ogg|opus|aiff?)$/i, "audio"],
  [/\.(txt|srt|vtt|md|csv|json)$/i, "text"],
];

/** The kind of a file, from its content type, then its name or address. */
export function kindOf(contentType: string | undefined, nameOrUrl: string | undefined): OutputKind {
  const type = (contentType ?? "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("text/") || type === "application/json") return "text";
  const path = (nameOrUrl ?? "").split("?")[0];
  for (const [pattern, kind] of EXTENSION_KINDS) {
    if (pattern.test(path)) return kind;
  }
  return "file";
}

function fileNameOf(url: string, fallback: string): string {
  try {
    const name = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
    return name || fallback;
  } catch {
    return fallback;
  }
}

function answerText(answer: unknown): string {
  if (typeof answer === "string") return answer;
  if (!Array.isArray(answer)) return "";
  return answer
    .map((part) => (typeof part === "string" ? part : part && typeof part === "object" ? String(part.text ?? "") : ""))
    .join("");
}

/**
 * The items a finished task produced. Files come from its outputs; an LLM answer comes from the
 * structured output; models that only print their result (speech to text, for example) give it
 * as standard output, which is shown as text.
 */
export function taskResults(task: Pick<Task, "id" | "outputs" | "debugoutput">): ResultItem[] {
  const items: ResultItem[] = [];
  (task.outputs ?? []).forEach((output, index) => {
    if (output.contenttype === "raw" && output.content) {
      const text = answerText(output.content.answer).trim() || String(output.content.raw ?? "").trim();
      if (text) items.push({ id: `${task.id}-${index}`, kind: "text", text, name: `wiro-${task.id}.txt` });
      return;
    }
    if (!output.url) return;
    const name = output.name || fileNameOf(output.url, `output-${index + 1}`);
    const size = Number(output.size);
    items.push({
      id: `${task.id}-${index}`,
      kind: kindOf(output.contenttype, name || output.url),
      url: output.url,
      name,
      mimeType: output.contenttype || undefined,
      sizeBytes: Number.isFinite(size) && size > 0 ? size : undefined,
    });
  });
  const printed = (task.debugoutput ?? "").trim();
  if (items.length === 0 && printed) {
    items.push({ id: `${task.id}-text`, kind: "text", text: printed, name: `wiro-${task.id}.txt` });
  }
  return items;
}

export function formatBytes(bytes: number | undefined): string | undefined {
  if (!bytes || bytes <= 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
