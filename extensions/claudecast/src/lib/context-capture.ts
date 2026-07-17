import {
  Clipboard,
  getSelectedText,
  getFrontmostApplication,
} from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import { getGitInfo } from "./project-discovery";
import { getMostRecentGitWorkspace } from "./vscode-storage";

const execFilePromise = promisify(execFile);

// Known editor process names for AppleScript interactions (whitelist for security)
const KNOWN_EDITORS = ["Code", "Cursor", "Code - Insiders", "VSCodium"];

export interface CapturedContext {
  selectedText?: string;
  clipboard?: string;
  projectPath?: string;
  currentFile?: string;
  gitBranch?: string;
  gitHasChanges?: boolean;
  frontmostApp?: string;
}

/**
 * Get the currently selected text
 */
async function getSelection(): Promise<string | undefined> {
  try {
    const text = await getSelectedText();
    return text.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get clipboard content
 */
async function getClipboardContent(): Promise<string | undefined> {
  try {
    const clipboard = await Clipboard.readText();
    return clipboard?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Detect VS Code project from window title and app info
 */
async function detectVSCodeProject(): Promise<{
  projectPath?: string;
  currentFile?: string;
}> {
  // Try to get window title from each known editor via AppleScript
  // Only use whitelisted editors for security
  for (const editorProcess of KNOWN_EDITORS) {
    try {
      const script = `tell application "System Events" to tell process "${editorProcess}" to get name of front window`;
      const { stdout } = await execFilePromise("osascript", ["-e", script], {
        timeout: 2000,
      });

      const windowTitle = stdout.trim();
      if (windowTitle) {
        const result = parseVSCodeWindowTitle(windowTitle);
        if (result.projectPath) {
          const fullPath = await findProjectPath(result.projectPath);
          if (fullPath) {
            return { projectPath: fullPath, currentFile: result.currentFile };
          }
        }
      }
    } catch {
      // Editor not running or no window, try next
    }
  }

  // Fallback: check recent workspaces from storage
  const recentProject = await getVSCodeRecentWorkspace();
  if (recentProject) {
    return { projectPath: recentProject };
  }

  return {};
}

/**
 * Parse VS Code window title to extract project and file info
 */
function parseVSCodeWindowTitle(windowTitle: string): {
  projectPath?: string;
  currentFile?: string;
} {
  // VS Code window title format: "filename - folder - VS Code"
  // or "folder - VS Code"
  const parts = windowTitle.split(" - ");

  let currentFile: string | undefined;
  let projectPath: string | undefined;

  if (parts.length >= 2) {
    // Check if first part looks like a file
    if (parts[0].includes(".")) {
      currentFile = parts[0];
      projectPath = parts[1];
    } else {
      projectPath = parts[0];
    }
  }

  return { projectPath, currentFile };
}

/**
 * Get the most recent VS Code workspace from storage
 * Uses shared utility to avoid code duplication
 */
async function getVSCodeRecentWorkspace(): Promise<string | undefined> {
  return getMostRecentGitWorkspace();
}

/**
 * Try to find the full path of a project by name
 */
async function findProjectPath(
  projectName: string,
): Promise<string | undefined> {
  // Common development directories
  const searchDirs = [
    path.join(os.homedir(), "dev"),
    path.join(os.homedir(), "Development"),
    path.join(os.homedir(), "projects"),
    path.join(os.homedir(), "Projects"),
    path.join(os.homedir(), "code"),
    path.join(os.homedir(), "Code"),
    path.join(os.homedir(), "workspace"),
    path.join(os.homedir(), "work"),
    path.join(os.homedir(), "devstuff"),
    path.join(os.homedir(), "repos"),
    path.join(os.homedir(), "Documents"),
    path.join(os.homedir(), "Desktop"),
  ];

  for (const searchDir of searchDirs) {
    const potentialPath = path.join(searchDir, projectName);
    try {
      await fs.promises.access(potentialPath);
      return potentialPath;
    } catch {
      // Not found in this directory
    }
  }

  // Try Claude's known projects
  const claudeProjectsDir = path.join(os.homedir(), ".claude", "projects");
  try {
    const dirs = await fs.promises.readdir(claudeProjectsDir);
    for (const dir of dirs) {
      // Decode the path and check if it ends with the project name
      const decodedPath = "/" + dir.slice(1).replace(/-/g, "/");

      // Security: Validate that decoded path is absolute and doesn't contain traversal
      const normalizedPath = path.normalize(decodedPath);
      if (!path.isAbsolute(normalizedPath) || normalizedPath.includes("..")) {
        continue; // Skip suspicious paths
      }

      if (
        decodedPath.endsWith(`/${projectName}`) ||
        path.basename(decodedPath) === projectName
      ) {
        try {
          await fs.promises.access(normalizedPath);
          return normalizedPath;
        } catch {
          // Path doesn't exist on disk anymore
        }
      }
    }
  } catch {
    // Claude projects dir doesn't exist
  }

  return undefined;
}

/**
 * Capture all available context
 */
export async function captureContext(): Promise<CapturedContext> {
  // Run captures in parallel
  const [selectedText, clipboard, vscodeInfo, frontmostApp] = await Promise.all(
    [
      getSelection(),
      getClipboardContent(),
      detectVSCodeProject(),
      getFrontmostApplication().catch(() => null),
    ],
  );

  const context: CapturedContext = {
    selectedText,
    clipboard,
    projectPath: vscodeInfo.projectPath,
    currentFile: vscodeInfo.currentFile,
    frontmostApp: frontmostApp?.name,
  };

  // Get git info if we have a project path
  if (context.projectPath) {
    const gitInfo = await getGitInfo(context.projectPath);
    if (gitInfo) {
      context.gitBranch = gitInfo.branch;
      context.gitHasChanges = gitInfo.hasChanges;
    }
  }

  return context;
}

/**
 * Format captured context as a string for inclusion in prompts
 */
export function formatContextForPrompt(context: CapturedContext): string {
  const parts: string[] = [];

  if (context.projectPath) {
    parts.push(`Project: ${context.projectPath}`);
  }

  if (context.currentFile) {
    parts.push(`Current file: ${context.currentFile}`);
  }

  if (context.gitBranch) {
    parts.push(
      `Git branch: ${context.gitBranch}${context.gitHasChanges ? " (has changes)" : ""}`,
    );
  }

  if (context.selectedText) {
    parts.push(`\nSelected text:\n\`\`\`\n${context.selectedText}\n\`\`\``);
  }

  if (context.clipboard && context.clipboard !== context.selectedText) {
    // Only include clipboard if it's different from selection and looks like code
    if (looksLikeCode(context.clipboard)) {
      parts.push(`\nClipboard (code):\n\`\`\`\n${context.clipboard}\n\`\`\``);
    }
  }

  return parts.join("\n");
}

/**
 * Simple heuristic to check if text looks like code
 */
function looksLikeCode(text: string): boolean {
  const codeIndicators = [
    /function\s+\w+/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /var\s+\w+\s*=/,
    /class\s+\w+/,
    /import\s+.*from/,
    /export\s+(default\s+)?/,
    /def\s+\w+\s*\(/,
    /async\s+(function|def)/,
    /=>\s*{/,
    /\{\s*\n/,
    /^\s*(if|for|while|switch|try)\s*\(/m,
    /<[A-Z]\w+(\s|\/|>)/,
    /^\s*#include/m,
    /^\s*package\s+\w+/m,
    /^\s*impl\s+\w+/m,
    /fn\s+\w+\s*\(/,
  ];

  return codeIndicators.some((regex) => regex.test(text));
}

/**
 * Get selected text or clipboard as code context
 */
export async function getCodeContext(): Promise<string | undefined> {
  const selected = await getSelection();
  if (selected) return selected;

  const clipboard = await getClipboardContent();
  if (clipboard && looksLikeCode(clipboard)) {
    return clipboard;
  }

  return undefined;
}
