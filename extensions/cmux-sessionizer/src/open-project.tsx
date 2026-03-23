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
import { useCachedPromise } from "@raycast/utils";
import { useCallback } from "react";
import { execSync, execFile } from "child_process";
import { promisify } from "util";
import { homedir } from "os";

const execFileAsync = promisify(execFile);

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

const FD_PATH = (() => {
  try {
    return execSync("which fd", { encoding: "utf-8", timeout: 2000 }).trim();
  } catch {
    return null;
  }
})();

const PRUNE_DIRS = [
  "node_modules",
  ".cache",
  "vendor",
  ".venv",
  "venv",
  "__pycache__",
  ".terraform",
  "target",
  "build",
  "dist",
  ".gradle",
  "Pods",
];

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

function buildScanCommand(
  resolved: string,
  maxDepth: number,
): { cmd: string; args: string[] } {
  if (FD_PATH) {
    return {
      cmd: FD_PATH,
      args: [
        "--hidden",
        "--type",
        "d",
        "--max-depth",
        String(maxDepth),
        "^\\.git$",
        resolved,
      ],
    };
  }

  const pruneExpr = PRUNE_DIRS.flatMap((name) => ["-name", name, "-o"]).slice(
    0,
    -1,
  );

  return {
    cmd: "/usr/bin/find",
    args: [
      resolved,
      "-maxdepth",
      String(maxDepth),
      "(",
      ...pruneExpr,
      ")",
      "-prune",
      "-o",
      "-name",
      ".git",
      "-type",
      "d",
      "-print",
    ],
  };
}

async function findProjectsAsync(
  sourceDirs: string[],
  maxDepth: number,
): Promise<Project[]> {
  const results = await Promise.all(
    sourceDirs.map(async (dir) => {
      const trimmed = dir.trim();
      const resolved = resolveHome(trimmed);
      try {
        const { cmd, args } = buildScanCommand(resolved, maxDepth);
        const { stdout } = await execFileAsync(cmd, args, {
          encoding: "utf-8",
          timeout: 15000,
        });
        return stdout
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
              sourceDir: trimmed,
            };
          });
      } catch {
        return [];
      }
    }),
  );

  return results.flat().sort((a, b) => a.name.localeCompare(b.name));
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
  const preferences = getPreferenceValues<Preferences>();
  const dirs = preferences.sourceDirectories.split(",").filter(Boolean);
  const depth = parseInt(preferences.maxDepth, 10) || 4;

  const {
    data: projects,
    isLoading,
    revalidate,
  } = useCachedPromise(findProjectsAsync, [dirs, depth], {
    keepPreviousData: true,
    initialData: [] as Project[],
    failureToastOptions: { title: "Failed to scan for projects" },
  });

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
        actions={
          <ActionPanel>
            <Action
              title="Refresh Projects"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => revalidate()}
            />
          </ActionPanel>
        }
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
              <Action
                title="Refresh Projects"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
