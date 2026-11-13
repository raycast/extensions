import { runSoulverCli } from "../utils/soulver-cli";

type Input = {
  /** Name or ID of the sheet to export */
  sheet: string;
  /** Format to export the sheet as */
  format: "txt" | "csv" | "html" | "png";
  /** Output file path on disk (e.g. ~/Desktop/budget.csv) */
  outputPath?: string;
  /** Copy text output directly to clipboard (txt format) */
  toClipboard?: boolean;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Exports a Soulver sheet to text, CSV, HTML, or PNG format.
 */
export default async function tool(input: Input) {
  if (!input.sheet || !input.format) {
    throw new Error("Sheet and format are required");
  }

  const args = ["export", input.format, "--sheet", input.sheet];

  if (input.toClipboard) {
    args.push("--clipboard");
  } else if (input.outputPath) {
    args.push("--output", input.outputPath);
  }

  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }

  const output = await runSoulverCli(args);
  return output || `Exported sheet "${input.sheet}" as ${input.format}.`;
}
