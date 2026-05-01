import { openConnectionWindow } from "../lib/mcp";
import { openConnectionDeeplink } from "../lib/deeplink";

type Input = {
  /** UUID of the TablePro connection. */
  connectionId: string;
};

export default async function tool(input: Input): Promise<{ opened: true }> {
  try {
    await openConnectionWindow(input.connectionId);
  } catch {
    await openConnectionDeeplink(input.connectionId);
  }
  return { opened: true };
}
