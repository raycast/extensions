import { Tool } from "@raycast/api";
import { run, summarizeRun } from "../lib/cli";

type Input = {
  /** Absolute paths of the images to place in the PDF, one per page, in order. At least one. */
  paths: string[];
  /**
   * Page size: "fit" (each page wraps its image, default), "a4", "letter", or a
   * custom size in millimeters like "210x297mm". Omit for "fit".
   */
  pageSize?: string;
  /** JPEG quality for embedded images, 40–100. Omit for the default (85). */
  quality?: number;
  /** Password required to open the resulting PDF. Omit for no password. */
  password?: string;
  /** Output file or directory. Omit to write `<first>.pdf` next to the first input. */
  output?: string;
  /** Overwrite the output file if it already exists. Defaults to false. */
  overwrite?: boolean;
};

/**
 * Build a multi-page PDF from images, one image per page, in the order given.
 * Returns the produced output path and any error.
 */
export default async function (input: Input) {
  const result = await run("images-to-pdf", {
    input: input.paths,
    pageSize: input.pageSize?.trim() || undefined,
    quality: input.quality,
    password: input.password || undefined,
    output: input.output?.trim() || undefined,
    overwrite: input.overwrite,
  });
  // A freshly-built PDF isn't a size reduction — don't report "saved %".
  return summarizeRun(result, { showSavings: false, outputNoun: "PDF" });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Create a PDF from ${input.paths.length} image${input.paths.length === 1 ? "" : "s"}?`,
  info: [
    { name: "Images", value: String(input.paths.length) },
    ...(input.pageSize ? [{ name: "Page size", value: input.pageSize }] : []),
    ...(input.quality != null ? [{ name: "Quality", value: String(input.quality) }] : []),
    ...(input.password ? [{ name: "Password", value: "Yes" }] : []),
    ...(input.overwrite ? [{ name: "Overwrite", value: "Yes" }] : []),
  ],
});
