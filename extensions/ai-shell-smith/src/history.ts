import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const TAIL_BYTES = 81920;

export function getHistoryFile(shell: string): string {
  const home = homedir();
  if (shell.includes("zsh")) return resolve(home, ".zsh_history");
  if (shell.includes("bash")) return resolve(home, ".bash_history");
  if (shell.includes("fish"))
    return resolve(home, ".local/share/fish/fish_history");
  return resolve(home, ".bash_history");
}

// zsh: "timestamp;command" — bash: plain command — fish: YAML "- cmd: command"
export function parseHistoryLine(line: string, shell: string): string {
  const trimmed = line.trim();
  if (!trimmed) return "";

  if (shell.includes("zsh")) {
    const firstSemicolonIndex = trimmed.indexOf(";");
    return firstSemicolonIndex !== -1
      ? trimmed.slice(firstSemicolonIndex + 1).trim()
      : trimmed;
  }
  if (shell.includes("fish")) {
    return trimmed.startsWith("- cmd:")
      ? trimmed.replace(/^-\s*cmd:\s*/, "").trim()
      : "";
  }
  return trimmed;
}

export function isMetaCommand(cmd: string): boolean {
  const trimmed = cmd.trim();
  return (
    trimmed === "k" ||
    trimmed === "./k" ||
    trimmed === "raycast" ||
    trimmed.startsWith("komplete") ||
    trimmed.startsWith("./komplete")
  );
}

export function readLastCommands(
  path: string,
  shell: string,
  maxCommands: number
): string[] {
  if (!existsSync(path)) return [];

  let content: string;
  try {
    const fileBuffer = readFileSync(path);
    content = fileBuffer.toString(
      "utf-8",
      Math.max(0, fileBuffer.length - TAIL_BYTES)
    );
  } catch {
    return [];
  }

  const commands: string[] = [];
  for (const line of content.split("\n").reverse()) {
    if (commands.length >= maxCommands) break;
    const parsed = parseHistoryLine(line, shell);
    if (parsed && !isMetaCommand(parsed)) commands.push(parsed);
  }
  return commands.reverse();
}

export async function getShellHistory(
  shell: string,
  maxCommands = 10
): Promise<string[]> {
  return readLastCommands(getHistoryFile(shell), shell, maxCommands);
}
