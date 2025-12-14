import {
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  closeMainWindow,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";

interface Preferences {
  projectPaths: string;
  enginePaths: string;
}

interface UnityProject {
  name: string;
  path: string;
  version: string;
  modifiedAt: number;
}

export default function Command() {
  const [projects, setProjects] = useState<UnityProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const preferences = getPreferenceValues<Preferences>();
  const isWindows = os.platform() === "win32";

  // --- FIND UNITY EDITOR FINDER  ---
  const getEditorPath = (version: string): string | null => {
    const relativeAppPath = isWindows ? path.join("Editor", "Unity.exe") : "Unity.app";

    let editorPath = "";
    if (isWindows) {
      editorPath = path.join("C:", "Program Files", "Unity", "Hub", "Editor", version, relativeAppPath);
    } else {
      editorPath = `/Applications/Unity/Hub/Editor/${version}/${relativeAppPath}`;
    }

    if (fs.existsSync(editorPath)) return editorPath;

    if (preferences.enginePaths && preferences.enginePaths.trim() !== "") {
      const customRoots = preferences.enginePaths.split(",").map((p) => p.trim());

      for (const root of customRoots) {
        const expandedRoot = root.replace(/^~/, os.homedir());

        const potentialPath = path.join(expandedRoot, version, relativeAppPath);

        if (fs.existsSync(potentialPath)) {
          return potentialPath;
        }
      }
    }

    return null;
  };

  const scanForProjects = (dirPath: string, foundProjects: UnityProject[], maxDepth = 3, currentDepth = 0) => {
    if (currentDepth > maxDepth) return;

    try {
      const versionPath = path.join(dirPath, "ProjectSettings", "ProjectVersion.txt");
      if (fs.existsSync(versionPath)) {
        try {
          const versionContent = fs.readFileSync(versionPath, "utf8");
          const versionMatch = versionContent.match(/m_EditorVersion: (.*)/);
          const version = versionMatch ? versionMatch[1].trim() : "Unknown";
          const stats = fs.statSync(dirPath);

          foundProjects.push({
            name: path.basename(dirPath),
            path: dirPath,
            version: version,
            modifiedAt: stats.mtime.getTime(),
          });
          return;
        } catch (error) {
          console.log(`Error reading project at ${dirPath}:`, error);
        }
      }

      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        if (item.startsWith(".") || ["node_modules", "Library", "Temp", "Build", "Builds"].includes(item)) {
          continue;
        }
        const fullPath = path.join(dirPath, item);
        try {
          const stat = fs.lstatSync(fullPath);
          if (stat.isDirectory() && !stat.isSymbolicLink()) {
            scanForProjects(fullPath, foundProjects, maxDepth, currentDepth + 1);
          }
        } catch {
          continue;
        }
      }
    } catch {
      console.log(`Error scanning ${dirPath}`);
    }
  };

  useEffect(() => {
    async function fetchProjects() {
      try {
        if (!preferences.projectPaths || preferences.projectPaths.trim() === "") {
          setProjects([]);
          setIsLoading(false);
          return;
        }

        const rawPaths = preferences.projectPaths.split(",").map((p) => p.trim());
        const foundProjects: UnityProject[] = [];

        for (const rawPath of rawPaths) {
          const searchPath = rawPath.replace(/^~/, os.homedir());
          if (!fs.existsSync(searchPath) || !fs.lstatSync(searchPath).isDirectory()) continue;
          scanForProjects(searchPath, foundProjects);
        }

        foundProjects.sort((a, b) => b.modifiedAt - a.modifiedAt);
        setProjects(foundProjects);
        setIsLoading(false);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Error", message: String(error) });
        setIsLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const launchProject = async (project: UnityProject) => {
    const editorPath = getEditorPath(project.version);

    if (!editorPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Editor Missing",
        message: `Could not find Unity ${project.version}`,
      });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Opening Project..." });

    const executablePath =
      !isWindows && editorPath.endsWith(".app") ? path.join(editorPath, "Contents", "MacOS", "Unity") : editorPath;

    const command = isWindows
      ? `"${executablePath}" -projectPath "${project.path}"`
      : `"${executablePath}" -projectPath "${project.path}" &`;

    exec(command, (error) => {
      if (error) console.error("Launch error:", error);
    });

    await closeMainWindow();
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Unity projects...">
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Projects Found"
          description="Check your paths in Extension Settings (Cmd+,)"
        />
      ) : (
        projects.map((project) => {
          const editorAppPath = getEditorPath(project.version);
          const hasIcon = editorAppPath !== null;

          const lastModified = new Date(project.modifiedAt);
          const now = new Date();
          const diffDays = Math.floor(Math.abs(now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24));

          let lastModifiedText = "Today";
          if (diffDays === 1) lastModifiedText = "Yesterday";
          else if (diffDays > 1) lastModifiedText = `${diffDays} days ago`;

          return (
            <List.Item
              key={project.path}
              icon={hasIcon ? { fileIcon: editorAppPath! } : { source: Icon.GameController, tintColor: "#222C37" }}
              title={project.name}
              subtitle={project.version}
              accessories={[{ text: lastModifiedText }]}
              actions={
                <ActionPanel>
                  <Action title="Open Project" icon={Icon.GameController} onAction={() => launchProject(project)} />
                  <Action.ShowInFinder path={project.path} />
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                    shortcut={{ modifiers: ["cmd"], key: "," }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
