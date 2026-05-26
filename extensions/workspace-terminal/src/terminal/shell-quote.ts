import type { CommandMode } from "../types";

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function shellCd(dir: string): string {
  return `cd -- ${shellQuote(dir)}`;
}

export function toAppleScriptString(value: string): string {
  const parts = value.replace(/\r\n/g, "\n").split("\n");
  const escapedParts = parts.map(
    (part) => `"${part.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
  );
  return escapedParts.join(" & linefeed & ");
}

export function buildCommandForMode(
  command: string | undefined,
  mode: CommandMode,
  shellPath: string,
): string | null {
  const trimmed = command?.trim();
  if (!trimmed || mode === "none") {
    return null;
  }

  if (mode === "commandOnly") {
    return trimmed;
  }

  return `${trimmed}; exec ${shellQuote(shellPath)}`;
}
