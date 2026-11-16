import { callAregTool } from "../lib/mcp";

type Input = {
  /**
   * Search words, a name or an organization number.
   */
  query?: string;
  /**
   * Municipality to limit to, by name or number, e.g. "Oslo" or "0301".
   */
  kommune?: string;
  /**
   * Postcode to limit to, e.g. "0155".
   */
  postnummer?: string;
  /**
   * County to limit to, by name, e.g. "Vestland".
   */
  fylke?: string;
  /**
   * Street address to search in, e.g. "Storgata".
   */
  gate?: string;
};

export default async function tool(input: Input) {
  return callAregTool("search", input);
}
