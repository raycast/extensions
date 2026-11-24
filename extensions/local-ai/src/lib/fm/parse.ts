import { stripAnsi } from "./ansi";
import { FmError } from "./errors";

export function parseTokenCount(stdout: string): number {
  const match = stripAnsi(stdout).match(/\d+/);
  if (!match) throw new FmError("unknown", "Could not read the token count from fm", stdout.trim() || undefined);
  return Number.parseInt(match[0], 10);
}
