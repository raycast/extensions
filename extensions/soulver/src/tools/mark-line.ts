import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Name or ID of the sheet */
  sheet: string;
  /** 1-based line number to mark */
  lineNumber: number;
  /** Behavior type to mark the line with */
  behaviour: "expression" | "subtotal" | "timepoint" | "running-total" | "running-budget";
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Marks a line behavior in a Soulver sheet.
 */
export default async function tool(input: Input) {
  if (!input.sheet || !input.lineNumber || !input.behaviour) {
    throw new Error("Sheet, lineNumber, and behaviour are required");
  }
  const args = ["line", "mark", input.behaviour, "--sheet", input.sheet, String(input.lineNumber)];
  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }
  return await runSoulverJson(args);
}
