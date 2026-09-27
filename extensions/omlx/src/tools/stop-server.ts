import { Tool } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { isServerRunning } from "../lib/omlx";

const execAsync = promisify(exec);
const OMLX_CLI = `${process.env.HOME}/.omlx/bin/omlx`;

export const confirmation: Tool.Confirmation<
  Record<string, never>
> = async () => ({
  message: "Stop the oMLX server? All loaded models will be unloaded.",
});

export default async function () {
  const running = await isServerRunning();
  if (!running) {
    return { success: true, message: "oMLX server is already stopped" };
  }

  await execAsync(`${OMLX_CLI} stop`);

  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (!(await isServerRunning())) {
      return { success: true, message: "oMLX server stopped" };
    }
  }

  return { success: false, message: "Server stop timed out" };
}
