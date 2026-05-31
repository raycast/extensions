import { execFileSync } from "child_process";
import { resolvePath, readFile } from "./storage";

export interface QmdResult {
  path: string;
  snippet: string;
  score: number;
}

function isRgAvailable(): boolean {
  try {
    execFileSync("which", ["rg"], { encoding: "utf-8", timeout: 1000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Search MiToDos directory with ripgrep — fast, respects .gitignore.
 * Uses execFileSync (array args, no shell injection).
 */
export function searchMitodos(mitodosDir: string, query: string, limit = 20): QmdResult[] {
  const dir = resolvePath(mitodosDir);
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const pattern = words
    .map((w) => w.replace(/[^\w\s-]/g, ""))
    .filter(Boolean)
    .join("|");
  if (!pattern) return [];

  try {
    const cmd = isRgAvailable() ? "rg" : "grep";
    const args =
      cmd === "grep"
        ? ["-ril", words[0].replace(/[^\w-]/g, ""), dir, "--include=*.md"]
        : ["-il", pattern, dir, "--type", "md", "--max-count", String(limit)];

    const output = execFileSync(cmd, args, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });

    const paths = output.trim().split("\n").filter(Boolean).slice(0, limit);

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
          snippet =
            (start > 0 ? "…" : "") +
            content.slice(start, end).replace(/\n/g, " ").trim() +
            (end < content.length ? "…" : "");
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
 * Uses execFileSync with array args — safe against injection.
 * Scoped to the configured wikiPath via qmd's --path flag.
 */
export function searchWikiWithQmd(wikiPath: string, query: string, limit = 10): QmdResult[] {
  try {
    execFileSync("which", ["qmd"], { encoding: "utf-8", timeout: 1000, stdio: "pipe" });
  } catch {
    return [];
  }

  const resolved = resolvePath(wikiPath);
  try {
    const output = execFileSync(
      "qmd",
      ["search", query, "--path", resolved, "--json", "--limit", String(limit)],
      { encoding: "utf-8", timeout: 15000, stdio: ["ignore", "pipe", "ignore"] },
    );
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((r: QmdResult) => r.path && r.path.startsWith(resolved)).slice(0, limit);
    }
    return [];
  } catch {
    return [];
  }
}
