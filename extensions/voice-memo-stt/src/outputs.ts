import type { Recording } from "./types";

/**
 * Formats a human would rather read, best first — the same preference vmt
 * applies when it has to pick one output to show.
 */
const READABLE_FORMATS = ["txt", "md"];

export type Output = { format: string; path: string };

/**
 * preferredOutput picks the transcription file to show, read, or copy: plain
 * text if it was written, then markdown, then whatever else exists. Returns
 * undefined for a recording that has not been transcribed.
 */
export function preferredOutput(recording: Recording): Output | undefined {
  for (const format of READABLE_FORMATS) {
    const path = recording.outputs[format];
    if (path) {
      return { format, path };
    }
  }
  const [format, path] = Object.entries(recording.outputs)[0] ?? [];
  return format && path ? { format, path } : undefined;
}

/**
 * asMarkdown keeps a transcript's line structure. Markdown collapses single
 * newlines into spaces, which would run every line of a diarized transcript
 * together, so plain text gets explicit hard breaks. Markdown output is already
 * markup and is left alone.
 */
export function asMarkdown(text: string, format: string): string {
  if (format === "md") {
    return text;
  }
  return text.split("\n").join("  \n");
}
