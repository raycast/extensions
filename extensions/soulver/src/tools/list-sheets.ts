import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Lists all sheets in the current or specified Soulver sheetbook.
 */
export default async function tool(input: Input) {
  const args = ["sheet", "list"];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}
