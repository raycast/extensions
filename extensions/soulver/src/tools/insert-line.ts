import { Tool } from "@raycast/api";
import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Name or ID of the sheet */
  sheet: string;
  /** 1-based line number position where to insert the new line */
  lineNumber: number;
  /** The expression, comment, or text line to insert */
  lineText: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Inserts a new line into a Soulver sheet at a specified line index.
 */
export default async function tool(input: Input) {
  if (!input.sheet || !input.lineNumber || !input.lineText) {
    throw new Error("Sheet, lineNumber, and lineText are required");
  }
  const args = ["line", "insert", "--sheet", input.sheet, "--at", String(input.lineNumber), input.lineText];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Are you sure you want to insert "${input.lineText}" at line ${input.lineNumber} on sheet "${input.sheet}"?`,
});
