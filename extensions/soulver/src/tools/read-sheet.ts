import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** The name or ID of the sheet to read */
  sheet: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Reads all lines and evaluated results from a Soulver sheet.
 */
export default async function tool(input: Input) {
  if (!input.sheet) {
    throw new Error("Sheet name or ID is required");
  }
  const args = ["line", "list", "--sheet", input.sheet];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}
