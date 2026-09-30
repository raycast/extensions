import { Tool } from "@raycast/api";
import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** The name or ID of the sheet */
  sheet: string;
  /** The 1-based line number to update */
  lineNumber: number;
  /** The new expression, comment, or text for the line */
  lineText: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Updates an existing line in a Soulver sheet.
 */
export default async function tool(input: Input) {
  if (!input.sheet || !input.lineNumber || !input.lineText) {
    throw new Error("Sheet, lineNumber, and lineText are required");
  }
  const args = ["line", "set", "--sheet", input.sheet, String(input.lineNumber), input.lineText];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Are you sure you want to update line ${input.lineNumber} on sheet "${input.sheet}" to "${input.lineText}"?`,
});
