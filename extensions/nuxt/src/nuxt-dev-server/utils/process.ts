/**
 * Utilities for detecting and managing Nuxt processes
 */

import { NUXT_PROCESS_KEYWORDS } from "../constants/config";
import type { ProjectInfo } from "./system";
import { extractCwdFromCommand, getCwdFromLsof, readPackageJson, readGitConfig, getProcessStats } from "./system";

/**
 * Complete information about a detected Nuxt process
 */
export interface NuxtProcess {
  pid: string;
  port: string;
  command: string;
  cwd?: string;
  projectInfo?: ProjectInfo;
  memory?: string;
  cpu?: string;
}

/**
 * Details fetched for a process (cached separately to avoid flickering)
 */
export interface ProcessDetails {
  cwd?: string;
  projectInfo?: ProjectInfo;
  memory?: string;
  cpu?: string;
}

/**
 * Parse lsof output line to extract PID and port
 * Format: "PID ADDRESS" (e.g., "12345 *:3000" or "12345 localhost:3000")
 */
export function parseLsofLine(line: string): { pid: string; port: string } | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const pid = parts[0];
  const address = parts[1];

  // Extract port from address (format: *:3000 or localhost:3000 or [::]:3000)
  const portMatch = address.match(/:(\d+)$/);
  if (!portMatch) return null;

  return { pid, port: portMatch[1] };
}

/**
 * Check if a process is a Nuxt/Nitro process based on command line
 */
export function isNuxtProcess(command: string): boolean {
  const lowerCommand = command.toLowerCase();
  return NUXT_PROCESS_KEYWORDS.some((keyword) => lowerCommand.includes(keyword));
}

/**
 * Find matching ps line for a given PID
 */
export function findPsLineForPid(psData: string, pid: string): string | null {
  const lines = psData.split("\n");
  for (const line of lines) {
    if (line.includes(pid) && isNuxtProcess(line)) {
      return line;
    }
  }
  return null;
}

/**
 * Extract command from ps aux output
 * ps aux format: user pid ... (10 fields before command)
 */
export function extractCommandFromPs(psLine: string): string {
  return psLine.split(/\s+/).slice(10).join(" ");
}

/**
 * Parse lsof and ps data to identify Nuxt processes
 */
export function parseNuxtProcesses(lsofData: string, psData: string | undefined): NuxtProcess[] {
  const processes: NuxtProcess[] = [];

  if (!lsofData || lsofData.trim() === "") {
    return processes;
  }

  const lsofLines = lsofData
    .trim()
    .split("\n")
    .filter((l) => l.trim());

  for (const line of lsofLines) {
    const parsed = parseLsofLine(line);
    if (!parsed) continue;

    const { pid, port } = parsed;

    // Verify this is a Nuxt process by checking ps data
    let command = `Node.js server on port ${port}`;
    let isNuxt = false;

    if (psData) {
      const psLine = findPsLineForPid(psData, pid);
      if (psLine) {
        isNuxt = true;
        command = extractCommandFromPs(psLine);
      }
    } else {
      // If we don't have ps data, assume any node process on target ports could be Nuxt
      isNuxt = true;
    }

    if (isNuxt) {
      processes.push({
        pid,
        port,
        command,
        cwd: undefined,
        projectInfo: undefined,
        memory: undefined,
        cpu: undefined,
      });
    }
  }

  return processes;
}

/**
 * Collect detailed information about a Nuxt process
 * This is expensive so we cache the results
 */
export function collectProcessDetails(pid: string, command: string): ProcessDetails {
  // Try to extract CWD from command
  let cwd = extractCwdFromCommand(command);

  // Fallback to lsof if needed
  if (!cwd) {
    cwd = getCwdFromLsof(pid);
  }

  if (!cwd) {
    return {};
  }

  // Read project info
  let projectInfo = readPackageJson(cwd);

  // Try to get git repo if not in package.json
  if (projectInfo && !projectInfo.repository) {
    const gitRepo = readGitConfig(cwd);
    if (gitRepo) {
      projectInfo = { ...projectInfo, repository: gitRepo };
    }
  }

  // Get resource usage
  const stats = getProcessStats(pid);

  return {
    cwd,
    projectInfo: projectInfo || undefined,
    ...stats,
  };
}
