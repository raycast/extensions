import fs from "node:fs";
import path from "node:path";
import {
  DependencyKind,
  LocalProject,
  PackageManagerName,
  ProjectDependency,
  ProjectScript,
  ScriptCategory,
} from "../types";
import { DEFAULT_PROJECT_DIRECTORIES, IGNORED_SCAN_DIRS, LOCKFILE_MAP } from "./constants";
import { expandTilde } from "./format";

interface RawPackageJson {
  name?: string;
  version?: string;
  description?: string;
  packageManager?: string;
  workspaces?: string[] | { packages?: string[] };
  engines?: { node?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

const LONG_RUNNING_NAME_PATTERNS = /^(dev|start|serve|watch|preview|storybook|studio|emulator|tunnel)/i;
const LONG_RUNNING_CMD_PATTERNS =
  /\b(next dev|vite(\s|$)|nuxt dev|astro dev|remix dev|webpack\s+serve|nodemon|tsx\s+watch|tsc\s+.*--watch|tsc\s+-w|vitest(\s|$)(?!.*run)|jest\s+--watch|storybook\s+dev|wrangler\s+dev|netlify\s+dev)\b/i;

export function classifyScript(name: string, command: string): { category: ScriptCategory; isLongRunning: boolean } {
  const lowerName = name.toLowerCase();
  const lowerCmd = command.toLowerCase();

  const isLongRunning =
    LONG_RUNNING_NAME_PATTERNS.test(lowerName) ||
    LONG_RUNNING_CMD_PATTERNS.test(lowerCmd) ||
    lowerName.includes(":watch") ||
    lowerName.includes(":dev");

  if (/^(dev|start|serve|preview|storybook|watch)/.test(lowerName)) {
    return { category: "dev", isLongRunning: true };
  }
  if (/^(build|compile|bundle|pack|dist|generate|codegen)/.test(lowerName)) {
    return { category: "build", isLongRunning: false };
  }
  if (/^(test|spec|e2e|vitest|jest|playwright|cypress|coverage)/.test(lowerName)) {
    return { category: "test", isLongRunning };
  }
  if (/^(lint|check|eslint|biome|oxlint|fix-lint)/.test(lowerName)) {
    return { category: "lint", isLongRunning: false };
  }
  if (/^(format|fmt|prettier)/.test(lowerName)) {
    return { category: "format", isLongRunning: false };
  }
  if (/^(typecheck|types|tsc|type-check)/.test(lowerName)) {
    return { category: "typecheck", isLongRunning };
  }
  if (/^(deploy|publish|release|ship)/.test(lowerName)) {
    return { category: "deploy", isLongRunning: false };
  }
  if (/^(clean|reset|purge|rimraf)/.test(lowerName)) {
    return { category: "clean", isLongRunning: false };
  }

  return { category: "other", isLongRunning };
}

export function parsePackageManagerField(field?: string): PackageManagerName | undefined {
  if (!field) return undefined;
  const cleaned = field.trim().toLowerCase();
  if (cleaned.startsWith("pnpm")) return "pnpm";
  if (cleaned.startsWith("yarn")) return "yarn";
  if (cleaned.startsWith("bun")) return "bun";
  if (cleaned.startsWith("npm")) return "npm";
  return undefined;
}

export function detectProjectPackageManager(
  projectDir: string,
  packageManagerField?: string,
  defaultPreference: "auto" | PackageManagerName = "auto",
): {
  packageManager: PackageManagerName;
  source: "lockfile" | "packageManagerField" | "default";
  lockfileName?: string;
} {
  // 1. Check projectDir and up to 2 ancestor dirs for lockfiles (monorepo support)
  let currentDir = projectDir;
  for (let depth = 0; depth < 3; depth++) {
    for (const entry of LOCKFILE_MAP) {
      const candidate = path.join(currentDir, entry.file);
      if (fs.existsSync(candidate)) {
        return {
          packageManager: entry.manager,
          source: "lockfile",
          lockfileName: entry.file,
        };
      }
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  // 2. Check package.json "packageManager" field (Corepack convention)
  const fromField = parsePackageManagerField(packageManagerField);
  if (fromField) {
    return { packageManager: fromField, source: "packageManagerField" };
  }

  // 3. Fallback to user preference or npm
  const fallback: PackageManagerName = defaultPreference === "auto" ? "npm" : defaultPreference;
  return { packageManager: fallback, source: "default" };
}

/**
 * Resolves the installed version of a package by inspecting node_modules/<pkg>/package.json,
 * walking up up to 3 parent directories for hoisted monorepo installations.
 */
export function resolveInstalledVersion(projectDir: string, packageName: string): string | undefined {
  let currentDir = projectDir;
  for (let depth = 0; depth < 4; depth++) {
    const pkgJsonPath = path.join(currentDir, "node_modules", ...packageName.split("/"), "package.json");
    try {
      const raw = fs.readFileSync(pkgJsonPath, "utf8");
      const parsed = JSON.parse(raw) as { version?: string };
      if (parsed.version) return parsed.version;
    } catch {
      // continue checking parent
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }
  return undefined;
}

export function readProjectAt(
  projectDir: string,
  options: {
    defaultPackageManager?: "auto" | PackageManagerName;
    pinnedPaths?: Set<string>;
    customPaths?: Set<string>;
  } = {},
): LocalProject | null {
  const resolvedDir = path.resolve(expandTilde(projectDir));
  const pkgJsonPath = path.join(resolvedDir, "package.json");

  if (!fs.existsSync(pkgJsonPath)) {
    return null;
  }

  let pkg: RawPackageJson;
  let stat: fs.Stats;
  try {
    stat = fs.statSync(pkgJsonPath);
    pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as RawPackageJson;
  } catch {
    return null;
  }

  const detected = detectProjectPackageManager(
    resolvedDir,
    pkg.packageManager,
    options.defaultPackageManager ?? "auto",
  );

  const dependencyKinds: DependencyKind[] = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ];

  const dependencies: ProjectDependency[] = [];
  for (const kind of dependencyKinds) {
    const map = pkg[kind];
    if (!map || typeof map !== "object") continue;
    for (const [depName, declaredRange] of Object.entries(map)) {
      if (typeof declaredRange !== "string") continue;
      dependencies.push({
        name: depName,
        declaredRange,
        installedVersion: resolveInstalledVersion(resolvedDir, depName),
        kind,
      });
    }
  }
  dependencies.sort((a, b) => a.name.localeCompare(b.name));

  const scripts: ProjectScript[] = Object.entries(pkg.scripts ?? {})
    .filter(([, cmd]) => typeof cmd === "string")
    .map(([name, command]) => {
      const { category, isLongRunning } = classifyScript(name, command);
      return { name, command, category, isLongRunning };
    });

  const workspacesList = Array.isArray(pkg.workspaces)
    ? pkg.workspaces
    : Array.isArray(pkg.workspaces?.packages)
      ? pkg.workspaces.packages
      : [];
  const hasPnpmWorkspace = fs.existsSync(path.join(resolvedDir, "pnpm-workspace.yaml"));
  const isMonorepo = workspacesList.length > 0 || hasPnpmWorkspace;

  const counts = {
    dependencies: Object.keys(pkg.dependencies ?? {}).length,
    devDependencies: Object.keys(pkg.devDependencies ?? {}).length,
    peerDependencies: Object.keys(pkg.peerDependencies ?? {}).length,
    optionalDependencies: Object.keys(pkg.optionalDependencies ?? {}).length,
    total: dependencies.length,
  };

  return {
    id: resolvedDir,
    name: pkg.name?.trim() || path.basename(resolvedDir),
    version: pkg.version,
    description: pkg.description,
    path: resolvedDir,
    packageJsonPath: pkgJsonPath,
    packageManager: detected.packageManager,
    packageManagerSource: detected.source,
    lockfileName: detected.lockfileName,
    isMonorepo,
    workspacesCount: workspacesList.length,
    nodeEngine: pkg.engines?.node,
    dependencies,
    scripts,
    counts,
    isPinned: options.pinnedPaths?.has(resolvedDir) ?? false,
    isCustom: options.customPaths?.has(resolvedDir) ?? false,
    lastModified: stat.mtimeMs,
  };
}

export function parseProjectDirectories(rawPref?: string): string[] {
  const source = rawPref?.trim() ? rawPref.split(",") : DEFAULT_PROJECT_DIRECTORIES;
  return source.map((entry) => expandTilde(entry.trim())).filter((entry) => Boolean(entry) && fs.existsSync(entry));
}

function scanDirectoryForProjects(
  dir: string,
  depth: number,
  maxDepth: number,
  discovered: Set<string>,
  visitedRealPaths: Set<string>,
  maxProjects = 150,
): void {
  if (depth > maxDepth || discovered.size >= maxProjects) return;

  let realDir: string;
  try {
    realDir = fs.realpathSync(dir);
  } catch {
    return;
  }

  if (visitedRealPaths.has(realDir)) return;
  visitedRealPaths.add(realDir);

  const pkgPath = path.join(realDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    discovered.add(realDir);
    // Keep scanning only 1 extra level inside monorepo workspaces (packages/, apps/)
    if (depth >= maxDepth) return;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(realDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (discovered.size >= maxProjects) break;
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".") || IGNORED_SCAN_DIRS.has(entry.name)) continue;

    // If this directory already has a package.json, only descend into standard monorepo subdirs
    if (discovered.has(realDir) && !["apps", "packages", "libs", "services", "workspaces"].includes(entry.name)) {
      continue;
    }

    scanDirectoryForProjects(
      path.join(realDir, entry.name),
      depth + 1,
      maxDepth,
      discovered,
      visitedRealPaths,
      maxProjects,
    );
  }
}

export function discoverLocalProjects(options: {
  projectDirectoriesPref?: string;
  scanDepth?: number;
  customPaths?: string[];
  pinnedPaths?: string[];
  activeProjectPath?: string;
  defaultPackageManager?: "auto" | PackageManagerName;
}): LocalProject[] {
  const maxDepth = Math.max(1, Math.min(6, options.scanDepth ?? 3));
  const roots = parseProjectDirectories(options.projectDirectoriesPref);
  const discoveredPaths = new Set<string>();
  const visitedRealPaths = new Set<string>();

  for (const root of roots) {
    scanDirectoryForProjects(root, 0, maxDepth, discoveredPaths, visitedRealPaths);
  }

  const customSet = new Set<string>();
  for (const custom of options.customPaths ?? []) {
    try {
      const resolved = fs.realpathSync(expandTilde(custom));
      discoveredPaths.add(resolved);
      customSet.add(resolved);
    } catch {
      // path no longer exists
    }
  }

  const pinnedSet = new Set<string>();
  for (const pinned of options.pinnedPaths ?? []) {
    try {
      pinnedSet.add(fs.realpathSync(expandTilde(pinned)));
    } catch {
      pinnedSet.add(path.resolve(expandTilde(pinned)));
    }
  }

  const projects: LocalProject[] = [];
  for (const projectDir of discoveredPaths) {
    const project = readProjectAt(projectDir, {
      defaultPackageManager: options.defaultPackageManager,
      pinnedPaths: pinnedSet,
      customPaths: customSet,
    });
    if (project) {
      projects.push(project);
    }
  }

  projects.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (options.activeProjectPath) {
      const aActive = a.path === options.activeProjectPath;
      const bActive = b.path === options.activeProjectPath;
      if (aActive !== bActive) return aActive ? -1 : 1;
    }
    return b.lastModified - a.lastModified;
  });

  return projects;
}
