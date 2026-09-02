import { Tool } from "@raycast/api";
import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Name or ID of the sheet */
  sheet: string;
  /** 1-based line number to delete */
  lineNumber: number;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Deletes a line from a Soulver sheet.
 */
export default async function tool(input: Input) {
  if (!input.sheet || !input.lineNumber) {
    throw new Error("Sheet and lineNumber are required");
  }
  const args = ["line", "delete", "--sheet", input.sheet, String(input.lineNumber)];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Are you sure you want to delete line ${input.lineNumber} from sheet "${input.sheet}"?`,
});
