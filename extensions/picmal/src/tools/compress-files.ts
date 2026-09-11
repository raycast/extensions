import { Tool } from "@raycast/api";
import { run, summarizeRun } from "../lib/cli";

type Input = {
  /** Absolute paths of the files to compress. */
  paths: string[];
  /**
   * Name of a Picmal compression preset to apply (case-insensitive). Omit to
   * compress with default settings. Use the `presets` the user mentions verbatim.
   */
  preset?: string;
  /** Quality from 0 to 100. Overrides a preset's quality when both are set. */
  quality?: number;
  /** Remove EXIF/IPTC/XMP metadata from the output. */
  stripMetadata?: boolean;
  /** Overwrite an output file if it already exists. Defaults to false. */
  overwrite?: boolean;
};

/**
 * Compress one or more files while keeping their format. Output is written next
 * to each input with a "_compressed" suffix. Returns the produced output paths,
 * per-file size savings, and any per-file errors.
 */
export default async function (input: Input) {
  const result = await run("compress", {
    input: input.paths,
    preset: input.preset?.trim() || undefined,
    quality: input.quality,
    stripMetadata: input.stripMetadata,
    overwrite: input.overwrite,
  });
  return summarizeRun(result);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Compress ${input.paths.length} file${input.paths.length === 1 ? "" : "s"}?`,
  info: [
    { name: "Files", value: String(input.paths.length) },
    ...(input.preset ? [{ name: "Preset", value: input.preset }] : []),
    ...(input.quality != null ? [{ name: "Quality", value: String(input.quality) }] : []),
    ...(input.overwrite ? [{ name: "Overwrite", value: "Yes" }] : []),
  ],
});
