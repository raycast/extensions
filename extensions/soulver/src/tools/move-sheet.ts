import { Tool } from "@raycast/api";
import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Name or ID of the sheet to move */
  sheet: string;
  /** Destination folder name */
  folder: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Moves a sheet into a specified folder in the Soulver sheetbook.
 */
export default async function tool(input: Input) {
  if (!input.sheet || !input.folder) {
    throw new Error("Sheet and folder are required");
  }
  const args = ["sheet", "move", input.sheet, "--to", input.folder];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Are you sure you want to move sheet "${input.sheet}" into folder "${input.folder}"?`,
});
