import { callAregTool } from "../lib/mcp";

type Input = {
  /**
   * Doffin notice id, e.g. "2026-116508".
   */
  id: string;
};

export default async function tool(input: Input) {
  return callAregTool("tender", input);
}
