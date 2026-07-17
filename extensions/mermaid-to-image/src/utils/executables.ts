import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import { exec } from "child_process";
import { Preferences } from "../types";
import { logOperationalError } from "./logger";

const execPromise = promisify(exec);

type ExecutableKind = "node" | "mmdc";

export class ExecutableLookupError extends Error {
  constructor(
    public readonly code: "NODE_NOT_FOUND" | "MMDC_NOT_FOUND",
    executable: ExecutableKind,
  ) {
    super(
      executable === "node"
        ? "Could not find Node.js installation. Please make sure Node.js is installed."
        : "mermaid-cli (mmdc) command not found. Please install it with 'npm install -g @mermaid-js/mermaid-cli' or specify the path in extension preferences",
    );
    this.name = "ExecutableLookupError";
  }
}

interface ExecutableLookupDependencies {
  fileExists: (targetPath: string) => boolean;
  execCommand: (command: string) => Promise<string>;
  readDir: (targetPath: string) => string[];
  homeDir: string;
}

function createLookupDependencies(): ExecutableLookupDependencies {
  return {
    fileExists: fs.existsSync,
    execCommand: async (command) => {
      const { stdout } = await execPromise(command);
      return stdout;
    },
    readDir: (targetPath) => fs.readdirSync(targetPath),
    homeDir: os.homedir(),
  };
}

function expandHomePath(inputPath: string, homeDir: string): string {
  return inputPath.startsWith("~/") ? inputPath.replace("~/", `${homeDir}/`) : inputPath;
}

function existingPaths(paths: string[], fileExists: (targetPath: string) => boolean): string[] {
  return paths.filter((candidate) => fileExists(candidate));
}

function readNvmVersions(dependencies: ExecutableLookupDependencies): string[] {
  const nvmPath = path.join(dependencies.homeDir, ".nvm", "versions", "node");
  try {
    return dependencies.readDir(nvmPath).sort();
  } catch (error) {
    logOperationalError("read-nvm-versions-failed", error, { path: nvmPath });
    return [];
  }
}

/**
 * Find Node.js executable path by checking common locations
 * and using various detection methods
 */
export async function locateNodeExecutable(
  dependencies: ExecutableLookupDependencies = createLookupDependencies(),
): Promise<string> {
  const possiblePaths = ["/usr/local/bin/node", "/opt/homebrew/bin/node", "/usr/bin/node"];

  const existingKnownPath = existingPaths(possiblePaths, dependencies.fileExists)[0];
  if (existingKnownPath) {
    return existingKnownPath;
  }

  try {
    const stdout = await dependencies.execCommand("which node");
    if (stdout.trim()) {
      return stdout.trim();
    }
  } catch (error) {
    logOperationalError("locate-node-which-failed", error, { failureClass: "which-node" });
  }

  const nvmVersions = readNvmVersions(dependencies);
  for (const versionName of nvmVersions.reverse()) {
    const nodePath = path.join(dependencies.homeDir, ".nvm", "versions", "node", versionName, "bin", "node");
    if (dependencies.fileExists(nodePath)) {
      return nodePath;
    }
  }

  throw new ExecutableLookupError("NODE_NOT_FOUND", "node");
}

/**
 * Find mmdc executable path, prioritizing user-specified custom path
 */
export async function locateMmdcExecutable(
  preferences: Partial<Preferences>,
  dependencies: ExecutableLookupDependencies = createLookupDependencies(),
): Promise<string> {
  if (preferences.customMmdcPath?.trim()) {
    const expandedPath = expandHomePath(preferences.customMmdcPath.trim(), dependencies.homeDir);
    if (dependencies.fileExists(expandedPath)) {
      return expandedPath;
    }
  }

  try {
    const stdout = await dependencies.execCommand("which mmdc");
    if (stdout.trim()) {
      return stdout.trim();
    }
  } catch (error) {
    logOperationalError("locate-mmdc-which-failed", error, { failureClass: "which-mmdc" });
  }

  const possiblePaths = [
    "/usr/local/bin/mmdc",
    "/opt/homebrew/bin/mmdc",
    "/usr/bin/mmdc",
    path.join(dependencies.homeDir, ".npm-global", "bin", "mmdc"),
    "/opt/homebrew/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/.bin/mmdc",
    "/usr/local/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/.bin/mmdc",
    path.join(dependencies.homeDir, ".local", "bin", "mmdc"),
  ];

  const existingKnownMmdcPath = existingPaths(possiblePaths, dependencies.fileExists)[0];
  if (existingKnownMmdcPath) {
    return existingKnownMmdcPath;
  }

  for (const versionName of readNvmVersions(dependencies).reverse()) {
    const candidate = path.join(dependencies.homeDir, ".nvm", "versions", "node", versionName, "bin", "mmdc");
    if (dependencies.fileExists(candidate)) {
      return candidate;
    }
  }

  throw new ExecutableLookupError("MMDC_NOT_FOUND", "mmdc");
}

export const findNodePath = locateNodeExecutable;
export const findMmdcPath = locateMmdcExecutable;
