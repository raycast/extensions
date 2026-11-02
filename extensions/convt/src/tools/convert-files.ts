import type { Tool } from "@raycast/api";
import { convertFiles } from "../lib/convt";
import { getBinary } from "../lib/preferences";

type Input = {
  /** Exact absolute paths to existing local files supplied by the user. Folders are not supported. */
  files: string[];
  /** Output format ID returned by get-targets, such as jpeg, webp, mp4, or pdf. */
  target: string;
  /** Existing output folder. Omit to save beside each original. */
  outputDirectory?: string;
  /** Lossy quality, a whole number from 1 to 100. Omit for Convt's default. */
  quality?: number;
  /** Maximum image edge in pixels, a positive whole number. */
  maxSize?: number;
  /** PDF page or range, such as 2, 1-3, or 4-. Omit for all pages. */
  pages?: string;
  /** PDF or SVG rendering resolution, a whole number from 18 to 1200. */
  dpi?: number;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message:
    "Convert these files locally with Convt? New files will be saved; originals and existing outputs are preserved.",
  info: [
    { name: "Files", value: input.files.join("\n") },
    { name: "Output Format", value: input.target },
    { name: "Output Folder", value: input.outputDirectory || "Beside each original" },
    ...(input.quality !== undefined ? [{ name: "Quality", value: String(input.quality) }] : []),
    ...(input.maxSize !== undefined ? [{ name: "Maximum Image Size", value: `${input.maxSize} px` }] : []),
    ...(input.pages !== undefined ? [{ name: "PDF Pages", value: input.pages }] : []),
    ...(input.dpi !== undefined ? [{ name: "Render DPI", value: String(input.dpi) }] : []),
  ],
});

/** Convert local files and return each file's actual output paths, failure, or cancellation. Never retry successful entries. */
export default async function tool(input: Input) {
  return convertFiles(await getBinary(), input);
}
