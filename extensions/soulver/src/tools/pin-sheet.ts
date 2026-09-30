import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Name or ID of the sheet to pin/unpin */
  sheet: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Pins a sheet in the Soulver sheetbook.
 */
export default async function tool(input: Input) {
  if (!input.sheet) {
    throw new Error("Sheet name or ID is required");
  }
  const args = ["sheet", "pin", input.sheet];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}
