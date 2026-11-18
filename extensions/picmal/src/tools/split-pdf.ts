import { Tool } from "@raycast/api";
import { run, summarizeRun } from "../lib/cli";

type Input = {
  /** Absolute paths of the PDFs to split. */
  paths: string[];
  /** Page ranges like `1-3,5,8-`. Omit to split every page into its own PDF. */
  pages?: string;
  /** Output directory for the split PDFs. Omit to write next to each input. */
  output?: string;
  /** Overwrite existing output files. Defaults to false. */
  overwrite?: boolean;
};

/**
 * Split each PDF into one document per page range. Returns the produced output
 * paths and any error.
 */
export default async function (input: Input) {
  const result = await run("split-pdf", {
    input: input.paths,
    pages: input.pages?.trim() || undefined,
    output: input.output?.trim() || undefined,
    overwrite: input.overwrite,
  });
  // Splitting isn't a size reduction — don't report "saved %".
  return summarizeRun(result, { showSavings: false, outputNoun: "PDF" });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: input.pages?.trim()
    ? `Split ${input.paths.length} PDF(s) by pages ${input.pages.trim()}?`
    : `Split ${input.paths.length} PDF(s) into one file per page?`,
  info: [
    { name: "PDFs", value: String(input.paths.length) },
    ...(input.pages?.trim() ? [{ name: "Pages", value: input.pages.trim() }] : []),
    ...(input.output ? [{ name: "Output", value: input.output }] : []),
    ...(input.overwrite ? [{ name: "Overwrite", value: "Yes" }] : []),
  ],
});
