import { callAregTool } from "../lib/mcp";

type Input = {
  /**
   * Full name as written in the register, in capitals, e.g. "ANDERS OPEDAL".
   */
  name: string;
  /**
   * Birth year.
   */
  born: number;
  /**
   * Register year for shareholdings. Leave out for the latest year with data.
   */
  year?: number;
};

export default async function tool(input: Input) {
  return callAregTool("person", input);
}
