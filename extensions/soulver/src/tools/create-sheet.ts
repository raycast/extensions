import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Name of the new sheet to create */
  name: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Creates a new sheet in the Soulver sheetbook.
 */
export default async function tool(input: Input) {
  if (!input.name) {
    throw new Error("Sheet name is required");
  }
  const args = ["sheet", "create", input.name];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}
