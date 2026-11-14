import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function expandTilde(p: string, home = os.homedir()): string {
  const trimmed = (p || "").trim();
  if (trimmed === "~") return home;
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
    return path.join(home, trimmed.slice(2));
  }
  return trimmed;
}

export function locateDeja(
  preferredPath?: string,
  envPath = process.env.PATH || "",
  home = os.homedir(),
  isFile: (p: string) => boolean = (p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  },
): string | null {
  const candidates: string[] = [];
  if (preferredPath && preferredPath.trim()) {
    candidates.push(expandTilde(preferredPath, home));
  }
  for (const dir of envPath.split(path.delimiter).filter(Boolean)) {
    candidates.push(path.join(dir, "deja"));
  }
  candidates.push(
    "/opt/homebrew/bin/deja",
    "/usr/local/bin/deja",
    path.join(home, ".local", "bin", "deja"),
    path.join(home, "go", "bin", "deja"),
  );
  for (const c of candidates) {
    if (isFile(c)) return c;
  }
  return null;
}
