import { Tool } from "@raycast/api";
import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Name or ID of the sheet to duplicate */
  sheet: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Duplicates an existing sheet in the Soulver sheetbook.
 */
export default async function tool(input: Input) {
  if (!input.sheet) {
    throw new Error("Sheet name or ID is required");
  }
  const args = ["sheet", "duplicate", input.sheet];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Are you sure you want to duplicate sheet "${input.sheet}"?`,
});
