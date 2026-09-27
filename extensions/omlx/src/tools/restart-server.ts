import { Tool } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { isServerRunning } from "../lib/omlx";

const execAsync = promisify(exec);
const OMLX_CLI = `${process.env.HOME}/.omlx/bin/omlx`;

export const confirmation: Tool.Confirmation<
  Record<string, never>
> = async () => ({
  message: "Restart the oMLX server? Active requests will be interrupted.",
});

export default async function () {
  await execAsync(`${OMLX_CLI} restart`);

  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await isServerRunning()) {
      return { success: true, message: "oMLX server restarted" };
    }
  }

  return {
    success: false,
    message: "Server restart timed out — it may still be starting",
  };
}
