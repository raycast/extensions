import { Tool } from "@raycast/api";
import { run, summarizeRun } from "../lib/cli";

type Input = {
  /** Absolute paths of the videos to combine, in play order. At least two. */
  paths: string[];
  /**
   * Output file or directory for the combined video. Omit to write
   * `<first> (combined).<ext>` next to the first input.
   */
  output?: string;
  /** Overwrite the output file if it already exists. Defaults to false. */
  overwrite?: boolean;
};

/**
 * Combine two or more videos into a single video, in the order given. Returns
 * the produced output path and any error.
 */
export default async function (input: Input) {
  const result = await run("combine-videos", {
    input: input.paths,
    output: input.output?.trim() || undefined,
    overwrite: input.overwrite,
  });
  // A combined video isn't a size reduction — don't report "saved %".
  return summarizeRun(result, { showSavings: false, outputNoun: "video" });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Combine ${input.paths.length} videos into one?`,
  info: [
    { name: "Videos", value: String(input.paths.length) },
    ...(input.output ? [{ name: "Output", value: input.output }] : []),
    ...(input.overwrite ? [{ name: "Overwrite", value: "Yes" }] : []),
  ],
});
