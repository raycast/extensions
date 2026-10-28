import path from "path";
import fs from "fs";

export interface ClaudeSpawnSpec {
  command: string;
  args: string[];
}

export function resolveWindowsClaudeShim(shimPath: string): string | null {
  const packageRoot = path.win32.join(
    path.win32.dirname(shimPath),
    "node_modules",
    "@anthropic-ai",
    "claude-code",
  );
  const candidates = [
    path.win32.join(packageRoot, "bin", "claude.exe"),
    path.win32.join(packageRoot, "cli.js"),
    path.win32.join(packageRoot, "cli.mjs"),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // Try the next known npm package entry point.
    }
  }
  return null;
}

export function getClaudeSpawnSpec(
  claudePath: string,
  args: string[],
  platform = process.platform,
): ClaudeSpawnSpec {
  const extension = path.win32.extname(claudePath).toLowerCase();
  if (platform === "win32" && [".js", ".mjs", ".cjs"].includes(extension)) {
    return { command: process.execPath, args: [claudePath, ...args] };
  }
  if (platform === "win32" && [".cmd", ".bat"].includes(extension)) {
    throw new Error(
      "Claude npm shim could not be resolved. Install the native Claude Code build or select claude.exe.",
    );
  }
  return { command: claudePath, args };
}
