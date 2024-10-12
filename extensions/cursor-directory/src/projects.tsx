import { List, ActionPanel, Action, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { expandPath, getRelativeTime, isGitRepository } from "./utils";
import { getPreferenceValues } from "@raycast/api";
import { Project } from "./types";
import { usePromise } from "@raycast/utils";
import { homedir } from "os";

export default function Command(props: LaunchProps<{ launchContext: { ruleContent?: string; replace?: boolean } }>) {
  const { ruleContent, replace } = props.launchContext ?? {};

  const {
    data: projects,
    isLoading,
    error,
  } = usePromise(async () => {
    return await loadProjects();
  });

  useEffect(() => {
    if (error) {
      console.error("Error loading projects: ", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong: ",
        message: error.message,
      });
    }
  }, [error]);

  async function handleSelectProject(project: Project) {
    await showHUD("Opening project...");
    await openProject(project.path);

    if (ruleContent) {
      await ensureCursorRulesFile(project.path);
      await applyCursorRule(project.path, ruleContent, replace ?? true);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter projects by name...">
      {projects ? (
        <List.Section title="Recent Projects">
          {projects.map((project) => (
            <List.Item
              key={project.path}
              title={project.name}
              subtitle={path.dirname(project.path).replace(homedir(), "~")}
              icon={{ fileIcon: project.path }}
              accessories={[
                {
                  text: getRelativeTime(project.lastAccessTime),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Open Project" onAction={async () => await handleSelectProject(project)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView />
      )}
    </List>
  );
}

async function getLastAccessTime(dirPath: string): Promise<number> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.atimeMs;
  } catch (error) {
    console.error(`Error getting last access time for ${dirPath}:`, error);
    return 0;
  }
}

async function findGitProjects(dirPath: string, maxDepth = 3): Promise<Project[]> {
  if (maxDepth === 0) return [];

  const projects: Project[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dirPath, entry.name);
      if (await isGitRepository(fullPath)) {
        const lastAccessTime = await getLastAccessTime(fullPath);
        projects.push({ name: entry.name, path: fullPath, lastAccessTime });
      } else {
        projects.push(...(await findGitProjects(fullPath, maxDepth - 1)));
      }
    }
  }

  return projects;
}

async function loadProjects(): Promise<Project[]> {
  try {
    const { projectsDirectory } = getPreferenceValues<Preferences>();
    const expandedPath = expandPath(projectsDirectory);
    const projects = await findGitProjects(expandedPath);
    return projects.sort((a, b) => (b.lastAccessTime ?? 0) - (a.lastAccessTime ?? 0));
  } catch (error) {
    console.error("Error loading projects:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to load projects",
      message: String(error),
    });
    return [];
  }
}

async function ensureCursorRulesFile(projectPath: string): Promise<void> {
  const cursorRulesPath = path.join(projectPath, ".cursorrules");
  try {
    await fs.access(cursorRulesPath);
  } catch {
    await fs.writeFile(cursorRulesPath, "");
  }
}

async function applyCursorRule(projectPath: string, ruleContent: string, replace: boolean): Promise<void> {
  const cursorRulesPath = path.join(projectPath, ".cursorrules");

  if (replace) {
    await fs.writeFile(cursorRulesPath, ruleContent);
  } else {
    await fs.appendFile(cursorRulesPath, "\n" + ruleContent);
  }

  await showHUD("Cursor rules applied successfully");
}

function openProject(projectPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`cursor ${projectPath}`, async (error) => {
      if (error) {
        console.error(error);
        await showToast({ style: Toast.Style.Failure, title: "Failed to open project", message: String(error) });
        reject(error);
      } else {
        await showHUD("Project opened successfully");
        resolve();
      }
    });
  });
}
