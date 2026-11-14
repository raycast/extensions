import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Search query text, number, or variable name */
  query: string;
  /** Optional sheet name or ID to restrict search scope */
  sheet?: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Searches for text or values across Soulver sheets.
 */
export default async function tool(input: Input) {
  if (!input.query) {
    throw new Error("Query is required");
  }
  const args = ["search", input.query];
  if (input.sheet) {
    args.push("--sheet", input.sheet);
  }
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}
