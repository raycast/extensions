import { runAppleScript } from "@raycast/utils";
import { shellQuote } from "./resources.js";

export type IngestAgent = "claude" | "codex" | "pi";

export function ingestTerminalCommand(
  executable: string,
  workspace: string,
  agent?: IngestAgent,
): string {
  const args = [
    executable,
    "ingest",
    "--workspace",
    workspace,
    ...(agent ? ["--agent", agent] : []),
  ];
  // Keep the user's shell PATH while adding the same Homebrew locations as capture.
  return `PATH="$PATH:/opt/homebrew/bin:/usr/local/bin" ${args.map(shellQuote).join(" ")}`;
}

export async function startIngestion(
  executable: string,
  workspace: string,
  agent?: IngestAgent,
): Promise<void> {
  await runAppleScript(
    `on run argv
      tell application "Terminal"
        activate
        do script (item 1 of argv)
      end tell
    end run`,
    [ingestTerminalCommand(executable, workspace, agent)],
  );
}
