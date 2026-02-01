import { readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";
import { homedir } from "os";

export interface Project {
  name: string;
  path: string;
  relativePath: string;
}

export const PROJECT_MARKERS = [
  ".git",
  "package.json",
  "Cargo.toml",
  "go.mod",
  "pyproject.toml",
  "Makefile",
  "pom.xml",
  "build.gradle",
  "CMakeLists.txt",
];

export const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "vendor",
  "target",
  ".next",
  ".venv",
  "venv",
  "__pycache__",
  ".cache",
  "coverage",
  ".turbo",
  ".output",
]);

export function expandPath(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

export function isProject(dirPath: string): boolean {
  return PROJECT_MARKERS.some((marker) => existsSync(join(dirPath, marker)));
}

/**
 * Extracts initials from a project name.
 * - For hyphenated/underscored names: takes first letter of each part (max 2)
 * - For camelCase/PascalCase: takes uppercase letters (max 2)
 * - Otherwise: takes first 1-2 characters
 */
export function getProjectInitials(name: string): string {
  // Remove common prefixes/suffixes
  const cleaned = name.replace(/^(the-|my-|@[\w-]+\/)/i, "");

  // Split by hyphens, underscores, or spaces
  const parts = cleaned.split(/[-_\s]+/).filter(Boolean);

  if (parts.length >= 2) {
    // Take first letter of first two parts
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Check for camelCase/PascalCase
  const camelParts = cleaned.match(/[A-Z][a-z]+|[a-z]+/g);
  if (camelParts && camelParts.length >= 2) {
    return (camelParts[0][0] + camelParts[1][0]).toUpperCase();
  }

  // Fallback: first 1-2 characters
  return cleaned.slice(0, 2).toUpperCase();
}

/**
 * Color palette that contrasts well with white text.
 * Each color has a name for display and a hex value.
 */
export const ICON_COLORS = [
  { name: "Red", value: "#E53935" },
  { name: "Pink", value: "#D81B60" },
  { name: "Purple", value: "#8E24AA" },
  { name: "Deep Purple", value: "#5E35B1" },
  { name: "Indigo", value: "#3949AB" },
  { name: "Blue", value: "#1E88E5" },
  { name: "Teal", value: "#00897B" },
  { name: "Green", value: "#43A047" },
  { name: "Orange", value: "#FB8C00" },
  { name: "Deep Orange", value: "#F4511E" },
  { name: "Brown", value: "#6D4C41" },
  { name: "Blue Grey", value: "#546E7A" },
] as const;

export type IconColor = (typeof ICON_COLORS)[number]["value"];

/**
 * Returns a random color from the palette.
 */
export function getRandomIconColor(): IconColor {
  const index = Math.floor(Math.random() * ICON_COLORS.length);
  return ICON_COLORS[index].value;
}

/**
 * Generates an SVG data URL icon with the given initials and background color.
 */
export function generateInitialsIcon(
  initials: string,
  bgColor: string,
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="32" fill="${bgColor}"/>
    <text x="32" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="600" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function findProjects(rootDir: string, maxDepth: number): Project[] {
  const projects: Project[] = [];
  const expandedRoot = expandPath(rootDir);

  function scan(dir: string, depth: number) {
    if (depth > maxDepth) return;

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith(".") && entry !== ".git") continue;
      if (EXCLUDED_DIRS.has(entry)) continue;

      const fullPath = join(dir, entry);

      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (!stat.isDirectory()) continue;

      if (isProject(fullPath)) {
        const relativePath = relative(expandedRoot, fullPath);
        projects.push({
          name: entry,
          path: fullPath,
          relativePath: relativePath || entry,
        });
      } else if (depth < maxDepth) {
        scan(fullPath, depth + 1);
      }
    }
  }

  scan(expandedRoot, 0);
  return projects.sort((a, b) => a.name.localeCompare(b.name));
}
