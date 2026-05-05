import fs from "fs/promises";
import path from "path";

import { CleanupCandidate, ProjectRecord } from "./types";

const COMMON_CANDIDATES = [".cache", "coverage"];

const ECOSYSTEM_CANDIDATES: Array<{
  ecosystem: string;
  appliesTo: (project: ProjectRecord) => boolean;
  paths: string[];
}> = [
  {
    ecosystem: "Node.js",
    appliesTo: (project) =>
      project.languages.includes("JavaScript") ||
      project.languages.includes("TypeScript") ||
      ["Next.js", "Nuxt", "Astro", "Vite", "React", "Vue", "Svelte", "Turborepo", "Nx"].some((framework) =>
        project.frameworks.includes(framework),
      ),
    paths: ["node_modules", ".next", ".nuxt", ".output", ".turbo", "dist", "build"],
  },
  {
    ecosystem: "Java/Spring",
    appliesTo: (project) => project.languages.includes("Java") || project.frameworks.includes("Spring Boot"),
    paths: ["target", "build", ".gradle", "out", "WEB-INF/lib", "WEB-INF/classes"],
  },
  {
    ecosystem: "Rust",
    appliesTo: (project) => project.languages.includes("Rust"),
    paths: ["target"],
  },
  {
    ecosystem: "Python",
    appliesTo: (project) => project.languages.includes("Python"),
    paths: [".venv", "__pycache__", ".pytest_cache", "dist", "build"],
  },
  {
    ecosystem: "iOS/Android",
    appliesTo: (project) =>
      project.languages.includes("Swift") ||
      project.languages.includes("Kotlin") ||
      project.frameworks.includes("Android"),
    paths: ["DerivedData", "build", ".gradle", "app/build"],
  },
];

export async function getCleanupCandidates(project: ProjectRecord): Promise<CleanupCandidate[]> {
  const candidates = new Map<string, CleanupCandidate>();

  for (const relativePath of COMMON_CANDIDATES) {
    await addCandidate(project, candidates, relativePath, "Common generated/cache output", "Common");
  }

  for (const rule of ECOSYSTEM_CANDIDATES) {
    if (!rule.appliesTo(project)) {
      continue;
    }

    for (const relativePath of rule.paths) {
      await addCandidate(
        project,
        candidates,
        relativePath,
        `${rule.ecosystem} generated dependency/build output`,
        rule.ecosystem,
      );
    }
  }

  return Array.from(candidates.values()).sort((candidateA, candidateB) =>
    candidateA.relativePath.localeCompare(candidateB.relativePath),
  );
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined) {
    return "Unknown";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

async function addCandidate(
  project: ProjectRecord,
  candidates: Map<string, CleanupCandidate>,
  relativePath: string,
  reason: string,
  ecosystem: string,
): Promise<void> {
  const candidatePath = path.join(project.path, relativePath);

  if (!isPathInside(candidatePath, project.path)) {
    return;
  }

  try {
    const stat = await fs.lstat(candidatePath);

    if (stat.isSymbolicLink()) {
      return;
    }

    candidates.set(candidatePath, {
      path: candidatePath,
      relativePath,
      reason,
      ecosystem,
      sizeBytes: await calculateSize(candidatePath),
    });
  } catch {
    return;
  }
}

async function calculateSize(candidatePath: string, depth = 0): Promise<number> {
  const MAX_DEPTH = 100;

  if (depth > MAX_DEPTH) {
    return 0;
  }

  const stat = await fs.lstat(candidatePath);

  if (stat.isSymbolicLink()) {
    return 0;
  }

  if (stat.isFile()) {
    return stat.size;
  }

  if (!stat.isDirectory()) {
    return 0;
  }

  const entries = await fs.readdir(candidatePath, { withFileTypes: true });
  let totalSize = 0;

  for (const entry of entries) {
    totalSize += await calculateSize(path.join(candidatePath, entry.name), depth + 1);
  }

  return totalSize;
}

function isPathInside(candidatePath: string, parentPath: string): boolean {
  const relativePath = path.relative(parentPath, candidatePath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}
