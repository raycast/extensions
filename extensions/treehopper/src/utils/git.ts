import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { RepoConfig, Worktree } from "../types";
import { getPreferences, getRepoPath } from "./config";

export function getWorktrees(repos: RepoConfig[]): Worktree[] {
  const worktrees: Worktree[] = [];
  const seen = new Set<string>();

  for (const repo of repos) {
    const repoPath = getRepoPath(repo.name);

    // Check if repo exists
    const gitPath = path.join(repoPath, ".git");
    if (!fs.existsSync(gitPath)) continue;

    try {
      const output = execSync("git worktree list", {
        cwd: repoPath,
        encoding: "utf-8",
      });

      const lines = output.trim().split("\n");
      for (const line of lines) {
        // Parse: /path/to/worktree  abc1234 [branch-name]
        const match = line.match(/^(.+?)\s+\w+\s+\[(.+?)\]/);
        if (match) {
          const wtPath = match[1].trim();
          const branch = match[2];
          // Dedupe by path
          if (seen.has(wtPath)) continue;
          seen.add(wtPath);
          worktrees.push({
            path: wtPath,
            branch,
            repoName: repo.name,
            isRoot: wtPath === repoPath,
          });
        }
      }
    } catch (e) {
      console.error(`Failed to list worktrees for ${repo.name}:`, e);
    }
  }

  return worktrees;
}

export function createWorktree(
  repoName: string,
  baseBranch: string,
  branchName: string,
): { success: boolean; path?: string; error?: string } {
  const prefs = getPreferences();
  const repoPath = getRepoPath(repoName);

  // Sanitize branch name for folder
  const folderName = branchName.replace(/\//g, "-");
  const worktreePath = path.join(
    prefs.reposDirectory,
    `wt-${repoName}-${folderName}`,
  );

  // Check if already exists
  if (fs.existsSync(worktreePath)) {
    return {
      success: false,
      error: `Worktree already exists at ${worktreePath}`,
    };
  }

  // Build shell script to run in terminal
  const setupScript = buildSetupScript(
    repoPath,
    worktreePath,
    baseBranch,
    branchName,
    prefs.editor,
  );

  // Run in terminal
  runInTerminal(setupScript, prefs.terminal);

  return { success: true, path: worktreePath };
}

function buildSetupScript(
  repoPath: string,
  worktreePath: string,
  baseBranch: string,
  branchName: string,
  editor: string,
): string {
  const worktreesJsonPath = path.join(repoPath, "worktrees.json");
  let setupCommands = "";

  // Check if worktrees.json exists in the repo
  if (fs.existsSync(worktreesJsonPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(worktreesJsonPath, "utf-8"));
      if (config["setup-worktree"] && Array.isArray(config["setup-worktree"])) {
        setupCommands = config["setup-worktree"]
          .map(
            (cmd: string) =>
              `echo "Running: ${cmd.replace(/"/g, '\\"')}" && ${cmd}`,
          )
          .join(" && ");
      }
    } catch {
      // Fallback to default
    }
  }

  if (!setupCommands) {
    // No default setup - user should add worktrees.json if needed
    setupCommands = `echo "No worktrees.json found, skipping setup."`;
  }

  const script = `
cd "${repoPath}" || exit 1
echo "Fetching latest from origin/${baseBranch}..."
git fetch origin ${baseBranch} 2>/dev/null

echo "Creating worktree with new branch ${branchName} from ${baseBranch}..."
git worktree add -b "${branchName}" "${worktreePath}" "origin/${baseBranch}"

if [ $? -ne 0 ]; then
  echo "Failed to create worktree"
  read -p "Press enter to close..."
  exit 1
fi

cd "${worktreePath}" || exit 1
export ROOT_WORKTREE_PATH="${repoPath}"

echo "Running setup..."
${setupCommands}

echo ""
echo "Created worktree: ${worktreePath}"
echo "Opening in ${editor}..."
${editor} "${worktreePath}"
exit 0
`.trim();

  return script;
}

function runInTerminal(script: string, terminal: string): void {
  // Write script to temp file and execute it
  const tempScript = `/tmp/treehopper-setup-${Date.now()}.sh`;
  fs.writeFileSync(tempScript, `#!/bin/bash\n${script}`, { mode: 0o755 });

  let osascript = "";
  switch (terminal) {
    case "iterm":
      osascript = `
        tell application "iTerm"
          activate
          set newWindow to (create window with default profile)
          tell current session of newWindow
            write text "bash '${tempScript}'; rm '${tempScript}'; exit"
          end tell
        end tell
      `;
      break;
    case "warp":
      osascript = `
        tell application "Warp"
          activate
        end tell
        delay 0.5
        tell application "System Events"
          keystroke "bash '${tempScript}'; rm '${tempScript}'; exit"
          keystroke return
        end tell
      `;
      break;
    default:
      osascript = `
        tell application "Terminal"
          activate
          do script "bash '${tempScript}'; rm '${tempScript}'; exit"
        end tell
      `;
  }

  try {
    execSync(`osascript -e '${osascript.replace(/'/g, "'\\''")}'`, {
      encoding: "utf-8",
    });
  } catch (e) {
    console.error("Failed to open terminal:", e);
  }
}
