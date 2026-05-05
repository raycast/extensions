import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

import { ProjectRecord, RunningProjectProcess, RuntimeProcess, RuntimeStatus } from "./types";

const execFileAsync = promisify(execFile);
const workspacePatternsCache = new Map<string, Promise<string[]>>();
const workspaceNameCache = new Map<string, Promise<string>>();
const COMMON_WORKSPACE_DIRECTORIES = new Set([
  "app",
  "apps",
  "package",
  "packages",
  "service",
  "services",
  "site",
  "sites",
]);

export async function getRuntimeStatuses(projects: ProjectRecord[]): Promise<Record<string, RuntimeStatus>> {
  const inactiveStatuses = Object.fromEntries(
    projects.map((project) => [
      project.id,
      {
        isActive: false,
        ports: [],
        processes: [],
      } satisfies RuntimeStatus,
    ]),
  );

  for (const match of await getProjectProcessMatches(projects)) {
    const status = inactiveStatuses[match.project.id];

    status.isActive = true;
    status.processes.push(match.process);
    status.ports = Array.from(new Set([...status.ports, match.process.port])).sort((portA, portB) => portA - portB);
  }

  return inactiveStatuses;
}

export async function getRunningProjectProcesses(projects: ProjectRecord[]): Promise<RunningProjectProcess[]> {
  const matches = await getProjectProcessMatches(projects);
  const runningProcesses = await Promise.all(
    matches.map(async ({ project, process }) => {
      const scope = await resolveRuntimeScope(project, process.cwd);

      return {
        id: `${project.id}:${process.pid}:${process.port}`,
        project,
        process,
        scopeName: scope?.name,
        scopePath: scope?.path ?? process.cwd,
        scopeRelativePath: scope?.relativePath ?? getRelativePath(project.path, process.cwd),
      } satisfies RunningProjectProcess;
    }),
  );

  return runningProcesses.sort((processA, processB) => {
    if (processA.project.path !== processB.project.path) {
      return processA.project.path.localeCompare(processB.project.path);
    }

    if (processA.scopePath !== processB.scopePath) {
      return processA.scopePath.localeCompare(processB.scopePath);
    }

    return processA.process.port - processB.process.port;
  });
}

export function killProcess(pid: number): void {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`Invalid process id: ${pid}`);
  }

  process.kill(pid, "SIGTERM");
}

async function getProjectProcessMatches(
  projects: ProjectRecord[],
): Promise<Array<{ project: ProjectRecord; process: RuntimeProcess }>> {
  if (process.platform !== "darwin" || projects.length === 0) {
    return [];
  }

  const listeningProcesses = await getListeningProcesses();
  const matches: Array<{ project: ProjectRecord; process: RuntimeProcess }> = [];

  for (const listeningProcess of listeningProcesses) {
    const cwd = await getProcessCwd(listeningProcess.pid);

    if (!cwd) {
      continue;
    }

    let bestMatchProject: ProjectRecord | null = null;
    let bestMatchDepth = -1;

    for (const project of projects) {
      if (!isPathInside(cwd, project.path)) {
        continue;
      }

      const depth = project.path.split(path.sep).length;
      if (depth > bestMatchDepth) {
        bestMatchDepth = depth;
        bestMatchProject = project;
      }
    }

    if (!bestMatchProject) {
      continue;
    }

    matches.push({
      project: bestMatchProject,
      process: {
        ...listeningProcess,
        cwd,
        protocol: "tcp",
      },
    });
  }

  return matches;
}

async function resolveRuntimeScope(
  project: ProjectRecord,
  cwd: string,
): Promise<{ name: string; path: string; relativePath: string } | undefined> {
  if (!isMonorepoProject(project) || !isPathInside(cwd, project.path)) {
    return undefined;
  }

  const relativeCwd = getRelativePath(project.path, cwd);

  if (relativeCwd === ".") {
    return undefined;
  }

  const workspacePatterns = await getWorkspacePatterns(project.path);
  const workspaceRelativePath =
    findWorkspaceRelativePath(relativeCwd, workspacePatterns) ?? inferWorkspaceRelativePath(relativeCwd);

  if (!workspaceRelativePath) {
    return undefined;
  }

  const workspacePath = path.join(project.path, workspaceRelativePath);

  return {
    name: await getWorkspaceName(workspacePath),
    path: workspacePath,
    relativePath: workspaceRelativePath,
  };
}

function isMonorepoProject(project: ProjectRecord): boolean {
  return project.frameworks.some(
    (framework) => framework === "Monorepo" || framework === "Turborepo" || framework === "Nx",
  );
}

async function getWorkspacePatterns(projectPath: string): Promise<string[]> {
  const cachedPatterns = workspacePatternsCache.get(projectPath);

  if (cachedPatterns) {
    return cachedPatterns;
  }

  const patternsPromise = loadWorkspacePatterns(projectPath);
  workspacePatternsCache.set(projectPath, patternsPromise);
  return patternsPromise;
}

async function loadWorkspacePatterns(projectPath: string): Promise<string[]> {
  const patterns = new Set<string>();

  try {
    const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, "package.json"), "utf8")) as {
      workspaces?: unknown;
    };
    const workspaces = packageJson.workspaces;

    if (Array.isArray(workspaces)) {
      for (const workspacePattern of workspaces) {
        if (typeof workspacePattern === "string") {
          patterns.add(normalizeWorkspacePattern(workspacePattern));
        }
      }
    } else if (isRecord(workspaces) && Array.isArray(workspaces.packages)) {
      for (const workspacePattern of workspaces.packages) {
        if (typeof workspacePattern === "string") {
          patterns.add(normalizeWorkspacePattern(workspacePattern));
        }
      }
    }
  } catch {
    // Ignore projects without a readable package.json workspace config.
  }

  try {
    const pnpmWorkspace = await fs.readFile(path.join(projectPath, "pnpm-workspace.yaml"), "utf8");

    for (const workspacePattern of parsePnpmWorkspacePatterns(pnpmWorkspace)) {
      patterns.add(normalizeWorkspacePattern(workspacePattern));
    }
  } catch {
    // Ignore projects without a pnpm workspace manifest.
  }

  return Array.from(patterns).filter(Boolean);
}

function parsePnpmWorkspacePatterns(contents: string): string[] {
  const patterns: string[] = [];
  const lines = contents.split(/\r?\n/);
  let inPackagesSection = false;
  let packagesIndentation = 0;

  for (const line of lines) {
    if (!inPackagesSection) {
      const packagesMatch = line.match(/^(\s*)packages:\s*$/);

      if (packagesMatch) {
        inPackagesSection = true;
        packagesIndentation = packagesMatch[1].length;
      }

      continue;
    }

    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const indentation = line.match(/^(\s*)/)?.[1].length ?? 0;

    if (indentation <= packagesIndentation && !trimmedLine.startsWith("-")) {
      break;
    }

    const itemMatch = line.match(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/);

    if (itemMatch) {
      patterns.push(itemMatch[1].trim());
    }
  }

  return patterns;
}

function normalizeWorkspacePattern(workspacePattern: string): string {
  return workspacePattern
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+$/, "");
}

function findWorkspaceRelativePath(relativeCwd: string, workspacePatterns: string[]): string | undefined {
  if (workspacePatterns.length === 0) {
    return undefined;
  }

  const segments = splitRelativePath(relativeCwd);

  for (let segmentCount = segments.length; segmentCount >= 1; segmentCount -= 1) {
    const candidatePath = segments.slice(0, segmentCount).join("/");

    if (workspacePatterns.some((workspacePattern) => matchesWorkspacePattern(candidatePath, workspacePattern))) {
      return candidatePath;
    }
  }

  return undefined;
}

function inferWorkspaceRelativePath(relativeCwd: string): string | undefined {
  const segments = splitRelativePath(relativeCwd);

  if (segments.length < 2 || !COMMON_WORKSPACE_DIRECTORIES.has(segments[0])) {
    return undefined;
  }

  return segments.slice(0, 2).join("/");
}

function matchesWorkspacePattern(candidatePath: string, workspacePattern: string): boolean {
  if (!workspacePattern || workspacePattern.startsWith("!")) {
    return false;
  }

  return matchWorkspaceSegments(splitRelativePath(candidatePath), splitRelativePath(workspacePattern));
}

function matchWorkspaceSegments(
  candidateSegments: string[],
  patternSegments: string[],
  candidateIndex = 0,
  patternIndex = 0,
): boolean {
  if (patternIndex === patternSegments.length) {
    return candidateIndex === candidateSegments.length;
  }

  const patternSegment = patternSegments[patternIndex];

  if (patternSegment === "**") {
    if (patternIndex === patternSegments.length - 1) {
      return true;
    }

    for (
      let nextCandidateIndex = candidateIndex;
      nextCandidateIndex <= candidateSegments.length;
      nextCandidateIndex += 1
    ) {
      if (matchWorkspaceSegments(candidateSegments, patternSegments, nextCandidateIndex, patternIndex + 1)) {
        return true;
      }
    }

    return false;
  }

  if (
    candidateIndex >= candidateSegments.length ||
    !segmentMatchesPattern(candidateSegments[candidateIndex], patternSegment)
  ) {
    return false;
  }

  return matchWorkspaceSegments(candidateSegments, patternSegments, candidateIndex + 1, patternIndex + 1);
}

function segmentMatchesPattern(candidateSegment: string, patternSegment: string): boolean {
  const pattern = new RegExp(`^${escapeForRegularExpression(patternSegment).replace(/\\\*/g, "[^/]*")}$`);
  return pattern.test(candidateSegment);
}

function escapeForRegularExpression(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.*]/g, "\\$&");
}

async function getWorkspaceName(workspacePath: string): Promise<string> {
  const cachedName = workspaceNameCache.get(workspacePath);

  if (cachedName) {
    return cachedName;
  }

  const workspaceNamePromise = loadWorkspaceName(workspacePath);
  workspaceNameCache.set(workspacePath, workspaceNamePromise);
  return workspaceNamePromise;
}

async function loadWorkspaceName(workspacePath: string): Promise<string> {
  try {
    const packageJson = JSON.parse(await fs.readFile(path.join(workspacePath, "package.json"), "utf8")) as {
      name?: string;
    };

    if (packageJson.name?.trim()) {
      return toWorkspaceDisplayName(packageJson.name);
    }
  } catch {
    // Fall back to the folder name when the workspace has no package.json.
  }

  return path.basename(workspacePath);
}

function toWorkspaceDisplayName(value: string): string {
  return value.trim().replace(/^@[^/]+\//, "");
}

async function getListeningProcesses(): Promise<Array<Omit<RuntimeProcess, "cwd" | "protocol">>> {
  try {
    const lsofPaths = ["/usr/sbin/lsof", "lsof", "/bin/lsof", "/usr/bin/lsof"];

    let stdout = "";
    let lastError: unknown;

    for (const lsofPath of lsofPaths) {
      try {
        const result = await execFileAsync(lsofPath, ["-nP", "-iTCP", "-sTCP:LISTEN"]);
        stdout = result.stdout;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!stdout) {
      throw lastError || new Error("lsof not found in any standard path");
    }

    const lines = stdout.split(/\r?\n/).slice(1).filter(Boolean);
    const processes = new Map<string, Omit<RuntimeProcess, "cwd" | "protocol">>();

    for (const line of lines) {
      const columns = line.trim().split(/\s+/);

      if (columns.length < 9) {
        continue;
      }

      const command = columns[0];
      const pid = Number(columns[1]);
      const name = columns.slice(8).join(" ");
      const portMatch = name.match(/:(\d+)\s+\(LISTEN\)$/);

      if (!Number.isInteger(pid) || !portMatch) {
        continue;
      }

      const port = Number(portMatch[1]);
      processes.set(`${pid}:${port}`, {
        pid,
        command,
        port,
      });
    }

    return Array.from(processes.values());
  } catch (error) {
    console.debug("Unable to inspect listening ports:", error);
    return [];
  }
}

async function getProcessCwd(pid: number): Promise<string | undefined> {
  try {
    const lsofPaths = ["/usr/sbin/lsof", "lsof", "/bin/lsof", "/usr/bin/lsof"];

    let stdout = "";
    let lastError: unknown;

    for (const lsofPath of lsofPaths) {
      try {
        const result = await execFileAsync(lsofPath, ["-a", "-p", String(pid), "-d", "cwd", "-Fn"]);
        stdout = result.stdout;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!stdout) {
      throw lastError || new Error("lsof not found");
    }

    const cwdLine = stdout.split(/\r?\n/).find((line) => line.startsWith("n") && line.length > 1);
    return cwdLine?.slice(1);
  } catch {
    return undefined;
  }
}

function getRelativePath(parentPath: string, candidatePath: string): string {
  const relativePath = path.relative(parentPath, candidatePath);
  return relativePath || ".";
}

function splitRelativePath(value: string): string[] {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".");
}

function isPathInside(candidatePath: string, parentPath: string): boolean {
  const relativePath = path.relative(parentPath, candidatePath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function isRecord(value: unknown): value is { packages?: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
