import { matchesLocalSearch } from "./query";
import { parsePaperlibCsv } from "./csv";
import { normalizePapers } from "./normalize";
import type { PaperEntity } from "./types";

export interface FileSystem {
  readFile(path: string, encoding: "utf8"): Promise<string>;
  writeFile?(path: string, data: string, encoding: "utf8"): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean; mtimeMs?: number }>;
}

export async function loadLocalPapers(
  fs: FileSystem,
  options: { file?: string; folder?: string },
): Promise<{ papers: PaperEntity[]; label: string; realmOnly?: boolean } | null> {
  const candidates: string[] = [];
  if (options.file) {
    candidates.push(options.file);
  }
  if (options.folder) {
    candidates.push(
      joinPath(options.folder, "library.json"),
      joinPath(options.folder, "papers.json"),
      joinPath(options.folder, "papers.csv"),
      joinPath(options.folder, "library.csv"),
    );
  }

  for (const candidate of unique(candidates)) {
    try {
      const info = await fs.stat(candidate);
      if (!info.isFile()) {
        continue;
      }
      const text = await fs.readFile(candidate, "utf8");
      const papers = parseLibraryText(text, candidate);
      if (papers.length > 0) {
        return { papers, label: candidate };
      }
    } catch {
      // Missing files are expected; try the next candidate.
    }
  }

  if (options.folder) {
    try {
      const names = await fs.readdir(options.folder);
      if (names.includes("default.realm")) {
        return { papers: [], label: joinPath(options.folder, "default.realm"), realmOnly: true };
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function filterPapers(papers: PaperEntity[], search: string): PaperEntity[] {
  return papers.filter((paper) =>
    matchesLocalSearch(
      [paper.title, paper.authors, paper.publication, paper.note, paper.abstract, paper.doi, paper.arxiv],
      search,
    ),
  );
}

export function parseLibraryText(text: string, filename: string): PaperEntity[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  if (filename.endsWith(".csv") || looksLikeCsv(trimmed)) {
    return parsePaperlibCsv(trimmed);
  }

  return normalizePapers(JSON.parse(trimmed) as unknown);
}

function looksLikeCsv(text: string): boolean {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  return /^\s*["']?title["']?\s*,/i.test(firstLine);
}

function joinPath(folder: string, name: string): string {
  if (folder.endsWith("/") || folder.endsWith("\\")) {
    return `${folder}${name}`;
  }
  return `${folder}/${name}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
