import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Name or ID of the sheet to archive */
  sheet: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Archives a sheet in the Soulver sheetbook.
 */
export default async function tool(input: Input) {
  if (!input.sheet) {
    throw new Error("Sheet name or ID is required");
  }
  const args = ["sheet", "archive", input.sheet];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}
