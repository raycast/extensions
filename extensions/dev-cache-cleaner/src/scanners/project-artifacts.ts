import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { basename, join } from "path";
import { getPreferenceValues } from "@raycast/api";
import type { ScanResult } from "../types";
import { expandHome, formatAge, formatBytes, getLastModified, getSizeAsync } from "../utils/disk";

/** Build artifact directories to scan for, inspired by Mole's purge_shared.sh */
const ARTIFACT_TARGETS = [
  "node_modules",
  ".next",
  ".nuxt",
  ".turbo",
  ".parcel-cache",
  ".angular",
  ".svelte-kit",
  ".expo",
  "venv",
  ".venv",
  "Pods",
  "DerivedData",
  ".build",
  "coverage",
  ".dart_tool",
  ".gradle",
];

/** Guarded targets — only clean if inside a project root with matching indicator */
const GUARDED_TARGETS = ["dist", "build", "vendor", "__pycache__", ".output", "target"];

/** Indicators that a directory is a project root */
const PROJECT_INDICATORS = [
  "package.json",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "Gemfile",
  "composer.json",
  "Pipfile",
  "pyproject.toml",
  "Package.swift",
  "Podfile",
  "pubspec.yaml",
];

/** Default search directories */
const DEFAULT_SEARCH_PATHS = [
  "~/Projects",
  "~/GitHub",
  "~/Code",
  "~/Workspace",
  "~/Repos",
  "~/Development",
  "~/dev",
  "~/www",
  "~/Sites",
];

export async function scanProjectArtifacts(): Promise<ScanResult[]> {
  const prefs = getPreferenceValues<Preferences>();
  const minAgeDays = parseInt(prefs.minAgeDays ?? "30", 10) || 30;
  const minAgeSeconds = minAgeDays * 86400;
  const now = Math.floor(Date.now() / 1000);

  const searchPaths = getSearchPaths(prefs.projectPaths);
  if (searchPaths.length === 0) return [];

  // Single find call with all targets at once — much faster than one per target
  const allTargets = [...ARTIFACT_TARGETS, ...GUARDED_TARGETS];
  const found = await findAllArtifacts(searchPaths, allTargets, 4);

  const results: ScanResult[] = [];
  const seen = new Set<string>();

  for (const artifactPath of found) {
    if (seen.has(artifactPath)) continue;
    seen.add(artifactPath);

    const dirName = basename(artifactPath);

    // Skip guarded targets unless inside a project root
    if (GUARDED_TARGETS.includes(dirName) && !isInsideProject(artifactPath)) {
      continue;
    }

    const lastMod = getLastModified(artifactPath);
    if (now - lastMod < minAgeSeconds) continue;

    const size = await getSizeAsync(artifactPath);
    if (size < 1024 * 1024) continue; // Skip < 1MB

    const projectName = getProjectName(artifactPath);
    const age = formatAge(lastMod);

    results.push({
      id: `artifact-${Buffer.from(artifactPath).toString("base64url").slice(0, 20)}`,
      title: `${dirName} (${projectName})`,
      description: `${formatBytes(size)} in ${projectName}, last modified ${age}. Safe to remove — rebuild with package install or build command.`,
      category: "build-artifacts",
      path: artifactPath,
      size,
      risk: "safe",
      available: true,
      cleanCommand: `rm -rf "${artifactPath}"`,
      cleanAction: { type: "rmrf" },
      icon: "hammer",
    });
  }

  // Sort by size descending
  results.sort((a, b) => b.size - a.size);
  return results;
}

function getSearchPaths(customPaths?: string): string[] {
  const paths: string[] = [];

  if (customPaths) {
    for (const p of customPaths.split(",")) {
      const trimmed = p.trim();
      if (trimmed) paths.push(expandHome(trimmed));
    }
  }

  if (paths.length === 0) {
    for (const p of DEFAULT_SEARCH_PATHS) {
      const expanded = expandHome(p);
      if (existsSync(expanded)) paths.push(expanded);
    }
  }

  return paths;
}

/**
 * Single optimized find call across all search paths and targets.
 * Uses -maxdepth to limit scan depth and -prune to avoid descending into matches.
 */
const execFileAsync = promisify(execFile);

async function findAllArtifacts(searchPaths: string[], targets: string[], maxDepth: number): Promise<string[]> {
  // Build: find path1 path2 ... -maxdepth N \( -name t1 -o -name t2 ... \) -type d -prune
  const args: string[] = [...searchPaths, "-maxdepth", String(maxDepth)];
  args.push("(");
  for (let i = 0; i < targets.length; i++) {
    if (i > 0) args.push("-o");
    args.push("-name", targets[i]);
  }
  args.push(")", "-type", "d", "-prune");

  try {
    const { stdout } = await execFileAsync("find", args, { timeout: 30000 });
    const output = String(stdout).trim();
    if (!output) return [];
    return output.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function isInsideProject(artifactPath: string): boolean {
  const parentDir = join(artifactPath, "..");
  return PROJECT_INDICATORS.some((indicator) => existsSync(join(parentDir, indicator)));
}

function getProjectName(artifactPath: string): string {
  const parts = artifactPath.split("/");
  const parentIndex = parts.length - 2;
  return parentIndex >= 0 ? parts[parentIndex] : basename(artifactPath);
}
