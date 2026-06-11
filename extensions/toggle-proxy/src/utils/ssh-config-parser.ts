import * as glob from "glob";
import fs from "fs";
import path from "path";
import os from "os";

export interface SshHostEntry {
  host: string;
  hostName?: string;
  user?: string;
  identityFile?: string;
  [key: string]: string | undefined;
}

export function loadFullSshConfig(configPath?: string): SshHostEntry[] {
  if (!configPath) {
    configPath = path.join(os.homedir(), ".ssh", "config");
  }
  const visitedPaths = new Set<string>();
  const allHosts: SshHostEntry[] = [];
  collectHostsRecursive(configPath, allHosts, visitedPaths);
  return allHosts;
}

/**
 * Recursively collects Host sections from the specified file and any included files.
 */
function collectHostsRecursive(filePath: string, accumulatedHosts: SshHostEntry[], visitedPaths: Set<string>) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    return;
  }
  if (visitedPaths.has(fullPath)) {
    return;
  }
  visitedPaths.add(fullPath);

  const content = fs.readFileSync(fullPath, "utf8");
  const lines = content.split(/\r?\n/);

  let currentHost: SshHostEntry | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    // === Handle Include ===
    // Example: "Include ~/.ssh/config.d/*"
    if (/^Include\s+/i.test(line)) {
      const includesPart = line.replace(/^Include\s+/i, "").trim();
      // There may be multiple paths after Include
      const includesList = includesPart.split(/\s+/).filter(Boolean);

      for (const inc of includesList) {
        const resolved = resolveIncludePaths(path.dirname(fullPath), inc);
        for (const incPath of resolved) {
          collectHostsRecursive(incPath, accumulatedHosts, visitedPaths);
        }
      }
      continue;
    }

    // === Handle Host ===
    if (/^Host\s+/i.test(line)) {
      if (currentHost) {
        accumulatedHosts.push(currentHost);
      }
      const hostName = line.replace(/^Host\s+/i, "").trim();
      // Ignore wildcard (*). This logic can be changed if needed
      if (hostName.includes("*")) {
        currentHost = null;
      } else {
        currentHost = { host: hostName };
      }
      continue;
    }

    // === Other parameters within a Host section ===
    if (!currentHost) {
      // Either global directives or a wildcard Host — skip
      continue;
    }
    const [paramRaw, ...rest] = line.split(/\s+/);
    const param = paramRaw.toLowerCase();
    const value = rest.join(" ");

    switch (param) {
      case "hostname":
        currentHost.hostName = value;
        break;
      case "user":
        currentHost.user = value;
        break;
      case "identityfile":
        currentHost.identityFile = value;
        break;
      default:
        currentHost[param] = value;
    }
  }

  if (currentHost) {
    accumulatedHosts.push(currentHost);
  }
}

/**
 * Resolves paths specified after `Include`, handling:
 *  - Tilde expansion (~/...)
 *  - Wildcard patterns (*, ?)
 */
function resolveIncludePaths(baseDir: string, incPath: string): string[] {
  // If the path starts with ~, replace with the home directory
  if (incPath.startsWith("~")) {
    incPath = path.join(os.homedir(), incPath.slice(1));
  }

  // If the path is not absolute, prepend baseDir
  if (!path.isAbsolute(incPath)) {
    incPath = path.join(baseDir, incPath);
  }

  // Check for wildcards. If none, return as-is
  if (!/[*?]/.test(incPath)) {
    return [incPath];
  }

  // Otherwise use glob to expand the pattern
  return glob.sync(incPath);
}
