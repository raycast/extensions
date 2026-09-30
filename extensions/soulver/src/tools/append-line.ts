import { Tool } from "@raycast/api";
import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** The name or ID of the sheet to append to */
  sheet: string;
  /** The expression, comment, or text line to append */
  lineText: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Appends a line to a specified Soulver sheet.
 */
export default async function tool(input: Input) {
  if (!input.sheet || !input.lineText) {
    throw new Error("Sheet and lineText are required");
  }
  const args = ["line", "append", "--sheet", input.sheet, input.lineText];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Are you sure you want to append "${input.lineText}" to sheet "${input.sheet}"?`,
});
