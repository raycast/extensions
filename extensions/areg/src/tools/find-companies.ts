import { callAregTool } from "../lib/mcp";

type Input = {
  /**
   * The figure to rank by: "operating_revenue", "net_income" or "total_assets". Defaults to "operating_revenue".
   */
  metric?: "operating_revenue" | "net_income" | "total_assets";
  /**
   * Smallest value, in thousands.
   */
  min?: number;
  /**
   * Largest value, in thousands.
   */
  max?: number;
  /**
   * Accounting year. Leave out for the latest year most companies have filed.
   */
  year?: number;
  /**
   * Maximum number of hits, default 20.
   */
  limit?: number;
};

export default async function tool(input: Input) {
  return callAregTool("find_companies", input);
}
