import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { execSync } from "child_process";
import { homedir } from "os";

interface Preferences {
  sourceDirectories: string;
  maxDepth: string;
}

interface Project {
  name: string;
  relativePath: string;
  fullPath: string;
  sourceDir: string;
}

const CMUX = "/Applications/cmux.app/Contents/Resources/bin/cmux";

function resolveHome(path: string): string {
  return path.replace(/^~/, homedir());
}

function cmux(args: string): string {
  return execSync(`${CMUX} ${args}`, {
    encoding: "utf-8",
    timeout: 5000,
    shell: "/bin/zsh",
    env: { ...process.env, HOME: homedir() },
  }).trim();
}

function findProjects(sourceDirs: string[], maxDepth: number): Project[] {
  const projects: Project[] = [];

  for (const dir of sourceDirs) {
    const resolved = resolveHome(dir.trim());
    try {
      const result = execSync(
        `find "${resolved}" -maxdepth ${maxDepth} -name .git -type d 2>/dev/null`,
        { encoding: "utf-8", timeout: 10000 },
      );
      const repos = result
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((gitDir) => {
          const fullPath = gitDir.replace(/\/\.git$/, "");
          const relativePath = fullPath.replace(`${resolved}/`, "");
          return {
            name: relativePath.split("/").pop() || relativePath,
            relativePath,
            fullPath,
            sourceDir: dir.trim(),
          };
        });
      projects.push(...repos);
    } catch {
      // Directory doesn't exist or isn't accessible
    }
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

function findExistingWorkspace(fullPath: string): string | null {
  const tildePath = fullPath.replace(homedir(), "~");
  try {
    const output = cmux("list-workspaces");
    for (const line of output.split("\n")) {
      if (line.includes(tildePath)) {
        const match = line.trim().match(/^\*?\s*(workspace:\d+)/);
        if (match) return match[1];
      }
    }
  } catch {
    // cmux not running
  }
  return null;
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    const dirs = preferences.sourceDirectories.split(",").filter(Boolean);
    const depth = parseInt(preferences.maxDepth, 10) || 4;
    setProjects(findProjects(dirs, depth));
    setIsLoading(false);
  }, []);

  const openProject = useCallback(async (project: Project) => {
    try {
      const existingRef = findExistingWorkspace(project.fullPath);

      if (existingRef) {
        cmux(`select-workspace --workspace "${existingRef}"`);
      } else {
        const output = cmux(`new-workspace --cwd "${project.fullPath}"`);
        const refMatch = output.match(/(workspace:\d+)/);
        if (refMatch) {
          const newRef = refMatch[1];
          cmux(`select-workspace --workspace "${newRef}"`);
          cmux(`rename-workspace --workspace "${newRef}" "${project.name}"`);
        }
      }

      execSync("open -a cmux");
      await closeMainWindow();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const shortMsg = msg.length > 200 ? "..." + msg.slice(-200) : msg;
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open project",
        message: shortMsg,
      });
    }
  }, []);

  return (
    <List searchBarPlaceholder="Search projects..." isLoading={isLoading}>
      <List.EmptyView
        title="No Projects Found"
        description="Check your source directories in the extension preferences."
        icon={Icon.Folder}
      />
      {projects.map((project) => (
        <List.Item
          key={project.fullPath}
          title={project.name}
          subtitle={
            project.relativePath !== project.name
              ? project.relativePath
              : undefined
          }
          accessories={[{ text: project.sourceDir }]}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action
                title="Open in Cmux"
                icon={Icon.Terminal}
                onAction={() => openProject(project)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
