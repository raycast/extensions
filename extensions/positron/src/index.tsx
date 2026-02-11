import { Action, ActionPanel, Color, List, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { homedir } from "os";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { execSync } from "child_process";

const POSITRON_APP_NAME = "Positron";

/**
 * Get the color for a git branch based on common branch naming conventions
 */
function getBranchColor(branchName: string): Color {
  const branch = branchName.toLowerCase();

  // Main/master branches
  if (branch === "main" || branch === "master") {
    return Color.Blue;
  }

  // Development branches
  if (branch === "develop" || branch === "dev" || branch === "development") {
    return Color.Purple;
  }

  // Feature branches
  if (branch.startsWith("feature/") || branch.startsWith("feat/")) {
    return Color.Green;
  }

  // Bug fix branches
  if (branch.startsWith("fix/") || branch.startsWith("bugfix/") || branch.startsWith("hotfix/")) {
    return Color.Red;
  }

  // Release branches
  if (branch.startsWith("release/") || branch.startsWith("rel/")) {
    return Color.Orange;
  }

  // Experimental or test branches
  if (branch.startsWith("experiment/") || branch.startsWith("test/") || branch.startsWith("chore/")) {
    return Color.Yellow;
  }

  // Default color for other branches
  return Color.SecondaryText;
}

/**
 * Get the current git branch for a given directory path
 */
function getGitBranch(projectPath: string): string | undefined {
  try {
    // Check if it's a git repository
    const gitDir = join(projectPath, ".git");
    if (!existsSync(gitDir)) {
      return undefined;
    }

    // Get the current branch using git command
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: projectPath,
      encoding: "utf8",
      timeout: 2000, // 2 second timeout
    }).trim();

    return branch || undefined;
  } catch {
    // If git command fails or directory is not a git repo, return undefined
    return undefined;
  }
}

interface RecentProject {
  path: string;
  name: string;
  lastModified?: Date;
  gitBranch?: string;
}

function getRecentProjects(): RecentProject[] {
  try {
    const workspaceStoragePath = join(
      homedir(),
      "Library",
      "Application Support",
      "Positron",
      "User",
      "workspaceStorage",
    );

    if (!existsSync(workspaceStoragePath)) {
      return [];
    }

    const projects: RecentProject[] = [];
    const workspaceDirs = readdirSync(workspaceStoragePath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const workspaceDir of workspaceDirs) {
      const workspaceJsonPath = join(workspaceStoragePath, workspaceDir, "workspace.json");

      if (existsSync(workspaceJsonPath)) {
        try {
          const workspaceData = JSON.parse(readFileSync(workspaceJsonPath, "utf8"));
          if (workspaceData.folder) {
            const folderUri = workspaceData.folder;
            const path = folderUri.replace("file://", "");
            const decodedPath = decodeURIComponent(path);

            // Check if the path still exists
            if (existsSync(decodedPath)) {
              const gitBranch = getGitBranch(decodedPath);
              projects.push({
                path: decodedPath,
                name: basename(decodedPath),
                gitBranch,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to parse workspace.json in ${workspaceDir}:`, error);
        }
      }
    }

    // Sort by most recently modified workspace directory
    return projects
      .map((project) => {
        const workspaceDir = workspaceDirs.find((dir) => {
          const workspaceJsonPath = join(workspaceStoragePath, dir, "workspace.json");
          if (existsSync(workspaceJsonPath)) {
            try {
              const workspaceData = JSON.parse(readFileSync(workspaceJsonPath, "utf8"));
              return (
                workspaceData.folder && decodeURIComponent(workspaceData.folder.replace("file://", "")) === project.path
              );
            } catch {
              return false;
            }
          }
          return false;
        });

        if (workspaceDir) {
          const statePath = join(workspaceStoragePath, workspaceDir, "state.vscdb");
          const stats = existsSync(statePath) ? statSync(statePath) : null;
          return {
            ...project,
            lastModified: stats?.mtime || new Date(0),
          };
        }
        return { ...project, lastModified: new Date(0) };
      })
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, 20);
  } catch {
    console.error("Failed to read recent projects");
    return [];
  }
}

async function openInPositron(path: string) {
  try {
    // Launch Positron and open the folder using AppleScript
    await runAppleScript(`
      tell application "${POSITRON_APP_NAME}"
        activate
        open POSIX file "${path}"
      end tell
    `);

    await showToast({
      title: "Opened in Positron",
      message: basename(path),
      style: Toast.Style.Success,
    });
  } catch {
    await showToast({
      title: "Failed to open in Positron",
      message: "Make sure Positron is installed",
      style: Toast.Style.Failure,
    });
  }
}

export default function Command() {
  const projects = getRecentProjects();

  return (
    <List searchBarPlaceholder="Search recent Positron projects...">
      {projects.length === 0 ? (
        <List.EmptyView
          title="No recent projects found"
          description="Make sure Positron is installed and has been used recently"
        />
      ) : (
        projects.map((project, index) => (
          <List.Item
            key={index}
            title={project.name}
            subtitle={project.path}
            accessories={[
              ...(project.gitBranch
                ? [
                    {
                      tag: {
                        value: project.gitBranch,
                        color: getBranchColor(project.gitBranch),
                      },
                      tooltip: `Git Branch: ${project.gitBranch}`,
                    },
                  ]
                : []),
            ]}
            icon={{ fileIcon: project.path }}
            actions={
              <ActionPanel>
                <Action
                  title={`Open in ${POSITRON_APP_NAME}`}
                  onAction={async () => await openInPositron(project.path)}
                />
                <Action.ShowInFinder path={project.path} />
                <Action.OpenWith path={project.path} />
                <Action.CopyToClipboard title="Copy Path" content={project.path} />
                {project.gitBranch && <Action.CopyToClipboard title="Copy Git Branch" content={project.gitBranch} />}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
