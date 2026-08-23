import { Tool } from "@raycast/api";
import { run, summarizeRun } from "../lib/cli";

type Input = {
  /** Absolute path of the source image to generate icons from. */
  path: string;
  /** Generate a macOS .icns. Omit all three format flags to generate every format. */
  macos?: boolean;
  /** Generate a Windows .ico. */
  windows?: boolean;
  /** Generate an iOS .appiconset. */
  ios?: boolean;
  /** Output directory. Omit to write a "<name> App Icons" folder next to the source. */
  output?: string;
  /** Overwrite existing output files. Defaults to false. */
  overwrite?: boolean;
};

/**
 * Generate app icons (.icns / .ico / iOS icon set) from one image. Returns the
 * produced output paths and any error.
 */
export default async function (input: Input) {
  const result = await run("app-icon", {
    input: [input.path],
    macos: input.macos,
    windows: input.windows,
    ios: input.ios,
    output: input.output?.trim() || undefined,
    overwrite: input.overwrite,
  });
  // Icons aren't a size reduction — don't report "saved %".
  return summarizeRun(result, { showSavings: false, outputNoun: "icon" });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const formats = [input.macos && "macOS", input.windows && "Windows", input.ios && "iOS"].filter(Boolean);
  return {
    message: `Generate app icons from ${input.path.split("/").pop()}?`,
    info: [
      { name: "Formats", value: formats.length ? formats.join(", ") : "All" },
      ...(input.overwrite ? [{ name: "Overwrite", value: "Yes" }] : []),
    ],
  };
};
