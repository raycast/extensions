import { runAppleScript } from "@raycast/utils";
import { getApfelPath } from ".";
import { escapeForShell } from "../../utils";

const EXPLAIN_SYSTEM_PROMPT = escapeForShell(
  "Explain what this text, command, error, or code snippet does briefly. Be short, only focus on key details and important parts. If it's an error, explain what caused it and how to fix it. You can use markdown. Keep the language same as the input if it is possible. You have a 60 second timeout, keep your answers within that time limit.",
);

export async function apfelExplain(text: string): Promise<string> {
  const truncated = escapeForShell(text);

  return await runAppleScript(
    `do shell script "echo '${truncated}' | ${getApfelPath()} -s '${EXPLAIN_SYSTEM_PROMPT}'"`,
    { timeout: 60000 },
  );
}
