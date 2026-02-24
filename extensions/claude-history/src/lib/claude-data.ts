import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import {
  PROJECTS_DIR,
  HISTORY_FILE,
  HISTORY_SEARCH_LIMIT,
} from "./constants.js";
import type { HistoryEntry, ProjectInfo, SessionSummary } from "./types.js";
import { decodeProjectPath, projectDisplayName } from "./formatters.js";
import { scanSessionSummary } from "./session-parser.js";

/** Max sessions to scan in total */
const MAX_TOTAL_SESSIONS = 60;

/**
 * Discover all projects from ~/.claude/projects/
 */
export function discoverProjects(): ProjectInfo[] {
  let entries: string[];
  try {
    entries = readdirSync(PROJECTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }

  const projects: ProjectInfo[] = [];

  for (const encoded of entries) {
    const projectDir = path.join(PROJECTS_DIR, encoded);
    let sessionFiles: string[];

    try {
      sessionFiles = readdirSync(projectDir).filter(
        (f) => f.endsWith(".jsonl") && !f.startsWith("agent-"),
      );
    } catch {
      continue;
    }

    if (sessionFiles.length === 0) continue;

    const decoded = decodeProjectPath(encoded);
    let maxMtime = 0;
    for (const f of sessionFiles) {
      try {
        const s = statSync(path.join(projectDir, f));
        if (s.mtimeMs > maxMtime) maxMtime = s.mtimeMs;
      } catch {
        // skip
      }
    }

    const lastActivity = maxMtime > 0 ? new Date(maxMtime) : undefined;

    projects.push({
      encodedPath: encoded,
      decodedPath: decoded,
      displayName: projectDisplayName(decoded),
      sessionCount: sessionFiles.length,
      lastActivity,
    });
  }

  projects.sort((a, b) => {
    const ta = a.lastActivity?.getTime() ?? 0;
    const tb = b.lastActivity?.getTime() ?? 0;
    return tb - ta;
  });

  return projects;
}

/**
 * List session file stubs for a project (sorted by mtime, no JSONL parsing).
 */
function listSessionFiles(
  encodedProject: string,
): { filePath: string; mtime: number }[] {
  const projectDir = path.join(PROJECTS_DIR, encodedProject);
  let files: string[];

  try {
    files = readdirSync(projectDir).filter(
      (f) => f.endsWith(".jsonl") && !f.startsWith("agent-"),
    );
  } catch {
    return [];
  }

  const stubs: { filePath: string; mtime: number }[] = [];
  for (const f of files) {
    const fp = path.join(projectDir, f);
    try {
      const s = statSync(fp);
      stubs.push({ filePath: fp, mtime: s.mtimeMs });
    } catch {
      // skip
    }
  }

  stubs.sort((a, b) => b.mtime - a.mtime);
  return stubs;
}

/**
 * Discover sessions for a specific project (synchronous).
 */
export function discoverSessions(encodedProject: string): SessionSummary[] {
  const stubs = listSessionFiles(encodedProject);

  const summaries: (SessionSummary | null)[] = stubs.map((stub) =>
    scanSessionSummary(stub.filePath, encodedProject),
  );

  // Deduplicate by sessionId, keeping the most recent file
  const seen = new Map<string, SessionSummary>();
  for (const s of summaries) {
    if (!s) continue;
    const existing = seen.get(s.sessionId);
    if (!existing || s.timestamp > existing.timestamp) {
      seen.set(s.sessionId, s);
    }
  }

  return Array.from(seen.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
}

/**
 * Discover all sessions across all projects (synchronous).
 * Caps total files scanned to avoid memory issues.
 */
export function discoverAllSessions(): SessionSummary[] {
  const projects = discoverProjects();

  // Collect file stubs from all projects, sorted by mtime globally
  const allStubs: {
    filePath: string;
    mtime: number;
    encodedProject: string;
  }[] = [];
  for (const p of projects) {
    for (const stub of listSessionFiles(p.encodedPath)) {
      allStubs.push({ ...stub, encodedProject: p.encodedPath });
    }
  }

  // Sort by most recent first, cap total
  allStubs.sort((a, b) => b.mtime - a.mtime);
  const capped = allStubs.slice(0, MAX_TOTAL_SESSIONS);

  // Scan synchronously (each reads only 16KB)
  const summaries = capped.map((stub) =>
    scanSessionSummary(stub.filePath, stub.encodedProject),
  );

  // Deduplicate by sessionId
  const seen = new Map<string, SessionSummary>();
  for (const s of summaries) {
    if (!s) continue;
    const existing = seen.get(s.sessionId);
    if (!existing || s.timestamp > existing.timestamp) {
      seen.set(s.sessionId, s);
    }
  }

  return Array.from(seen.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
}

/**
 * Search history.jsonl for matching prompts (synchronous).
 */
export function searchHistory(query: string): HistoryEntry[] {
  if (!query.trim()) return [];

  const results: HistoryEntry[] = [];
  const lowerQuery = query.toLowerCase();

  try {
    const content = readFileSync(HISTORY_FILE, "utf-8");
    for (const line of content.split("\n")) {
      if (results.length >= HISTORY_SEARCH_LIMIT) break;
      if (!line.trim()) continue;

      try {
        const entry: HistoryEntry = JSON.parse(line);
        if (entry.display && entry.display.toLowerCase().includes(lowerQuery)) {
          results.push(entry);
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File may not exist
  }

  results.sort((a, b) => b.timestamp - a.timestamp);
  return results;
}
