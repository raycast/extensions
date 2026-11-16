import { callAregTool } from "../lib/mcp";

type Input = {
  /**
   * Nine-digit Norwegian organisation number, e.g. "923609016". Use the search tool first if you only have a name.
   */
  orgnr: string;
  /**
   * Register year. Leave out for the latest year.
   */
  year?: number;
};

export default async function tool(input: Input) {
  return callAregTool("holdings", input);
}
