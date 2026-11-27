import { callAregTool } from "../lib/mcp";

type Input = {
  /**
   * Nine-digit Norwegian organization number, e.g. "923609016". Use the search tool first if you only have a name.
   */
  orgnr: string;
};

export default async function tool(input: Input) {
  return callAregTool("announcements", input);
}
