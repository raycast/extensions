import { Tool } from "@raycast/api";
import { run, summarizeRun } from "../lib/cli";

type Input = {
  /** Absolute paths of the files to convert. */
  paths: string[];
  /** Target format extension, e.g. "webp", "jpg", "png", "heic", "mp4", "mp3". Lowercase, no leading dot. */
  format: string;
  /**
   * Quality from 0 to 100. When set, the converted file is compressed to this
   * quality. Omit to convert at maximum quality (a pure format change, no
   * compression) — Picmal's default Convert behavior.
   */
  quality?: number;
  /** Remove EXIF/IPTC/XMP metadata from the output. */
  stripMetadata?: boolean;
  /** Overwrite an output file if it already exists. Defaults to false. */
  overwrite?: boolean;
};

/**
 * Convert one or more files to another format. Returns the produced output
 * paths, per-file size savings, and any per-file errors.
 */
export default async function (input: Input) {
  const result = await run("convert", {
    input: input.paths,
    format: input.format.trim().toLowerCase().replace(/^\./, ""),
    // Provided quality compresses; omitted → CLI does a pure format change (lets video stream-copy).
    quality: input.quality,
    stripMetadata: input.stripMetadata,
    overwrite: input.overwrite,
  });
  return summarizeRun(result);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Convert ${input.paths.length} file${input.paths.length === 1 ? "" : "s"} to ${input.format.toUpperCase()}?`,
  info: [
    { name: "Files", value: String(input.paths.length) },
    { name: "Format", value: input.format.toUpperCase() },
    ...(input.quality != null ? [{ name: "Quality", value: String(input.quality) }] : []),
    ...(input.overwrite ? [{ name: "Overwrite", value: "Yes" }] : []),
  ],
});
