import { Tool } from "@raycast/api";
import { run, summarizeRun } from "../lib/cli";

type Input = {
  /** Absolute paths of the PDFs to merge, in page order. At least two. */
  paths: string[];
  /**
   * Output file or directory for the merged PDF. Omit to write
   * `<first> (combined).pdf` next to the first input.
   */
  output?: string;
  /** Overwrite the output file if it already exists. Defaults to false. */
  overwrite?: boolean;
};

/**
 * Combine two or more PDFs into a single PDF, in the order given. Returns the
 * produced output path and any error.
 */
export default async function (input: Input) {
  const result = await run("combine", {
    input: input.paths,
    output: input.output?.trim() || undefined,
    overwrite: input.overwrite,
  });
  // A merged PDF isn't a size reduction — don't report "saved %".
  return summarizeRun(result, { showSavings: false, outputNoun: "PDF" });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Combine ${input.paths.length} PDFs into one?`,
  info: [
    { name: "PDFs", value: String(input.paths.length) },
    ...(input.output ? [{ name: "Output", value: input.output }] : []),
    ...(input.overwrite ? [{ name: "Overwrite", value: "Yes" }] : []),
  ],
});
