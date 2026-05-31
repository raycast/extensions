import { execSync } from "child_process";
import { resolvePath, readFile } from "./storage";

export interface QmdResult {
  path: string;
  snippet: string;
  score: number;
}

function isQmdAvailable(): boolean {
  try {
    execSync("HOME=/Users/rudlord qmd status", { encoding: "utf-8", timeout: 3000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function isRgAvailable(): boolean {
  try {
    execSync("which rg", { encoding: "utf-8", timeout: 1000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function escapeRg(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Search MiToDos directory with ripgrep — fast, respects .gitignore, always works.
 */
export function searchMitodos(mitodosDir: string, query: string, limit = 20): QmdResult[] {
  const dir = resolvePath(mitodosDir);
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const escaped = words.map(escapeRg).join("|");

  try {
    const cmd = isRgAvailable()
      ? `rg -il "${escaped}" "${dir}" --max-count=1 --type md 2>/dev/null | head -${limit}`
      : `grep -ril "${escapeRg(words[0])}" "${dir}" --include="*.md" 2>/dev/null | head -${limit}`;

    const output = execSync(cmd, { encoding: "utf-8", timeout: 5000 });
    const paths = output.trim().split("\n").filter(Boolean);

    return paths.map((filepath) => {
      let snippet = "";
      try {
        const content = readFile(filepath);
        const lower = content.toLowerCase();
        const firstWord = words[0].toLowerCase();
        const idx = lower.indexOf(firstWord);
        if (idx >= 0) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(content.length, idx + firstWord.length + 100);
          snippet = (start > 0 ? "…" : "") + content.slice(start, end).replace(/\n/g, " ").trim() + (end < content.length ? "…" : "");
        }
      } catch {
        snippet = `(match: ${words[0]})`;
      }
      return { path: filepath, snippet, score: 0.7 };
    });
  } catch {
    return [];
  }
}

/**
 * Search the wiki vault with QMD (secondary — only if QMD is available).
 */
export function searchWikiWithQmd(wikiPath: string, query: string, limit = 10): QmdResult[] {
  if (!isQmdAvailable()) return [];

  const resolved = resolvePath(wikiPath);
  try {
    const cmd = `HOME=/Users/rudlord qmd search "${query.replace(/"/g, '\\"')}" --json --limit ${limit}`;
    const output = execSync(cmd, {
      encoding: "utf-8",
      timeout: 15000,
      env: { ...process.env, HOME: "/Users/rudlord" },
    });
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter(
          (r: QmdResult) =>
            r.path && (r.path.startsWith(resolved) || r.path.includes("/wiki/")),
        )
        .slice(0, limit);
    }
    return [];
  } catch {
    return [];
  }
}
