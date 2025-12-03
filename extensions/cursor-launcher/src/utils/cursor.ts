import * as fs from "fs";
import * as path from "path";
import { homedir } from "os";
import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";

export interface RecentProject {
  path: string;
  name: string;
  lastOpened: number;
  projectType?: string;
}

export type ProjectType =
  | "node"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "php"
  | "ruby"
  | "git"
  | null;

// Cache for project type detection to avoid repeated filesystem calls
const projectTypeCache = new Map<string, ProjectType>();

export const detectProjectType = (projectPath: string): ProjectType => {
  // Check cache first
  if (projectTypeCache.has(projectPath)) {
    return projectTypeCache.get(projectPath) || null;
  }

  let detectedType: ProjectType = null;

  try {
    // Node.js / JavaScript / TypeScript
    if (fs.existsSync(path.join(projectPath, "package.json"))) {
      detectedType = "node";
    }
    // Python
    else if (
      fs.existsSync(path.join(projectPath, "requirements.txt")) ||
      fs.existsSync(path.join(projectPath, "setup.py")) ||
      fs.existsSync(path.join(projectPath, "pyproject.toml")) ||
      fs.existsSync(path.join(projectPath, "Pipfile"))
    ) {
      detectedType = "python";
    }
    // Go
    else if (
      fs.existsSync(path.join(projectPath, "go.mod")) ||
      fs.existsSync(path.join(projectPath, "go.sum"))
    ) {
      detectedType = "go";
    }
    // Rust
    else if (fs.existsSync(path.join(projectPath, "Cargo.toml"))) {
      detectedType = "rust";
    }
    // Java
    else if (
      fs.existsSync(path.join(projectPath, "pom.xml")) ||
      fs.existsSync(path.join(projectPath, "build.gradle")) ||
      fs.existsSync(path.join(projectPath, "build.gradle.kts"))
    ) {
      detectedType = "java";
    }
    // PHP
    else if (fs.existsSync(path.join(projectPath, "composer.json"))) {
      detectedType = "php";
    }
    // Ruby
    else if (
      fs.existsSync(path.join(projectPath, "Gemfile")) ||
      fs.existsSync(path.join(projectPath, "Rakefile"))
    ) {
      detectedType = "ruby";
    }
    // Git repository
    else if (fs.existsSync(path.join(projectPath, ".git"))) {
      detectedType = "git";
    }
  } catch {
    detectedType = null;
  }

  // Cache the result
  projectTypeCache.set(projectPath, detectedType);
  return detectedType;
};

/**
 * Clear the project type detection cache
 * Useful when project files change
 */
export const clearProjectTypeCache = (projectPath?: string): void => {
  if (projectPath) {
    projectTypeCache.delete(projectPath);
  } else {
    projectTypeCache.clear();
  }
};

export const findCursorExecutable = (): string | null => {
  // Try common Windows installation paths
  const username = process.env.USERNAME || process.env.USER || "user";
  const commonPaths = [
    path.join(
      process.env.LOCALAPPDATA || "",
      "Programs",
      "cursor",
      "Cursor.exe"
    ),
    path.join(
      "C:",
      "Users",
      username,
      "AppData",
      "Local",
      "Programs",
      "cursor",
      "Cursor.exe"
    ),
    path.join(
      homedir(),
      "AppData",
      "Local",
      "Programs",
      "cursor",
      "Cursor.exe"
    ),
  ];

  for (const cursorPath of commonPaths) {
    if (fs.existsSync(cursorPath)) {
      return cursorPath;
    }
  }

  // Try if 'cursor' command is in PATH
  return "cursor";
};

export const openInCursor = async (projectPath: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const cursorExecutable = findCursorExecutable();
    const command =
      cursorExecutable === "cursor"
        ? `cursor "${projectPath}"`
        : `"${cursorExecutable}" "${projectPath}"`;

    exec(command, (error: Error | null) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Open Cursor",
          message: `Could not open Cursor: ${error.message}`,
        });
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};
