import type { Permission } from "./permissions";

/** Marks stderr lines that are messages from `assets/type-keystrokes.js` rather than error output. */
export const messagePrefix = "__CLIPBOARD_TYPE__:";

export type ScriptMessage =
  | { type: "progress"; remaining: number }
  | { type: "stopped"; reason: "escape" | "app-switch" }
  | { type: "missing-permission"; permission: Permission }
  | { type: "output"; line: string };

/** Classifies one stderr line, or returns null for malformed or unknown script messages. */
export function parseScriptLine(line: string): ScriptMessage | null {
  if (!line.startsWith(messagePrefix)) return { type: "output", line };

  const [type, value] = line.slice(messagePrefix.length).split(":");
  if (type === "progress") {
    const remaining = Number.parseInt(value, 10);
    return Number.isFinite(remaining) ? { type, remaining } : null;
  }
  if (type === "stopped" && (value === "escape" || value === "app-switch")) return { type, reason: value };
  if (type === "error" && value === "accessibility") return { type: "missing-permission", permission: value };
  return null;
}

/** Reassembles lines from stream chunks, which can split a line anywhere. */
export function createLineSplitter(onLine: (line: string) => void) {
  let buffer = "";
  return {
    push(chunk: string) {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      lines.forEach(onLine);
    },
    /** Emits any trailing text that didn't end with a newline. */
    flush() {
      if (buffer) onLine(buffer);
      buffer = "";
    },
  };
}
