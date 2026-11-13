import type { Tool } from "@raycast/api";
import { convertFont } from "../lib/fonts";

type Input = {
  /** Exact absolute path to an existing TTF, OTF, WOFF, WOFF2, or EOT font file. */
  filePath: string;
  /** Output format. OTF is supported as an input only. */
  targetFormat: "ttf" | "woff" | "woff2" | "eot";
  /** Exact path to an existing output directory. Defaults to the source font's directory. */
  outputDirectory?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Convert this font to ${input.targetFormat.toUpperCase()} and save a new file? Existing files will not be overwritten.`,
  info: [
    { name: "Source Font", value: input.filePath },
    { name: "Output Format", value: input.targetFormat.toUpperCase() },
    { name: "Output Directory", value: input.outputDirectory || "Same directory as the source font" },
  ],
});

/** Convert a local font file to TTF, WOFF, WOFF2, or EOT. Save a new output file and return its path, size, and any conversion warnings. */
export default async function tool(input: Input) {
  return convertFont(input);
}
