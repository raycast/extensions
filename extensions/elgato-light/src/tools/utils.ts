import { getIPAddresses } from "../lib/utils";
import { execute } from "../lib/cli";

export type ToolResponse = {
  success: boolean;
  message: string;
};

export async function executeTool(args: string[]): Promise<void> {
  const ipAddresses = getIPAddresses();

  if (ipAddresses) {
    await execute(["--ip-address", ipAddresses, ...args]);
  } else {
    await execute(["--timeout", "15", ...args]);
  }
}
