import { environment, open, showToast, Toast } from "@raycast/api";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { terminalScript } from "../lib/terminal-script";

export async function runInTerminal(command: string) {
  const script = join(environment.supportPath, "github-cli.command");
  try {
    await mkdir(environment.supportPath, { recursive: true });
    await writeFile(script, terminalScript(command));
    await chmod(script, 0o755);
    await open(script, "com.apple.Terminal");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't open Terminal",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
