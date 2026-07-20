import { runAppleScript } from "@raycast/utils";
import { shellQuote } from "./shell";

const quoteAppleScriptString = (value: string) =>
  `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

export async function openTerminalAtPath(path: string): Promise<void> {
  await runTerminalCommand(`cd ${shellQuote(path)}`);
}

export async function openTerminalAtPathWithCommand(
  path: string,
  command: string,
): Promise<void> {
  await runTerminalCommand(`cd ${shellQuote(path)} && ${command}`);
}

async function runTerminalCommand(command: string): Promise<void> {
  await runAppleScript(`
    tell application "Terminal"
      activate
      do script ${quoteAppleScriptString(command)}
    end tell
  `);
}
