import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Name or ID of the sheet */
  sheet: string;
  /** 1-based line number to inspect */
  lineNumber: number;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Inspects line details and JSON metadata for a line in a Soulver sheet.
 */
export default async function tool(input: Input) {
  if (!input.sheet || !input.lineNumber) {
    throw new Error("Sheet and lineNumber are required");
  }
  const args = ["inspect", "line", "--sheet", input.sheet, "--line", String(input.lineNumber)];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}
