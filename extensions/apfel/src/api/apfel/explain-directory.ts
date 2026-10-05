// Converted from: https://github.com/Arthur-Ficial/apfel/blob/main/demo/wtd

import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import { runAppleScript } from "@raycast/utils";
import { getApfelPath } from ".";
import { escapeForShell } from "../../utils";

const SUMMARIZE_SYSTEM_PROMPT = escapeForShell(
  "Summarize what this directory/project is in 2-3 sentences. Mention: what language/framework, what it does, how to build/run it if obvious. Be concise and specific. Keep it short. You can use markdown.",
);

const PROJECT_FILES = [
  "README.md",
  "README",
  "readme.md",
  "Package.swift",
  "package.json",
  "Cargo.toml",
  "go.mod",
  "pyproject.toml",
  "Makefile",
  "Dockerfile",
  "docker-compose.yml",
  ".gitignore",
];

function buildSnapshot(dirPath: string): string {
  let snapshot = "";

  // File listing
  snapshot += `Directory: ${dirPath}\n`;
  snapshot += readdirSync(dirPath).slice(0, 30).join("\n") + "\n";

  // Key project files — first 5 lines each
  for (const file of PROJECT_FILES) {
    const filePath = join(dirPath, file);
    if (existsSync(filePath)) {
      const snippet = readFileSync(filePath, "utf8").split("\n").slice(0, 5).join("\n");
      snapshot += `\n--- ${file} (first 5 lines) ---\n${snippet}\n`;
    }
  }

  // Git info
  try {
    const branch = spawnSync("git", ["-C", dirPath, "branch", "--show-current"], { encoding: "utf8" }).stdout.trim();
    const lastCommit = spawnSync("git", ["-C", dirPath, "log", "--oneline", "-1"], { encoding: "utf8" }).stdout.trim();
    if (branch || lastCommit) {
      snapshot += `\n--- git ---\nbranch: ${branch}\nlast commit: ${lastCommit}\n`;
    }
  } catch {
    // not a git repo, skip
  }

  return snapshot;
}

export async function apfelExplainDirectory(dirPath: string): Promise<string> {
  const snapshot = escapeForShell(buildSnapshot(dirPath));

  return await runAppleScript(
    `do shell script "echo '${snapshot}' | ${getApfelPath()} -s '${SUMMARIZE_SYSTEM_PROMPT}'"`,
    { timeout: 60000 },
  );
}
