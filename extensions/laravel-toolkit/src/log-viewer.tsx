import { ActionPanel, Action, showToast, Toast, Icon, LocalStorage, Detail, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { getProjects, Project } from "./utils/projects";
import * as fs from "fs";
import * as path from "path";

const LAST_PROJECT_KEY = "last-active-project-logs";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [logContent, setLogContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentProject) {
      readLog(currentProject.path);
    }
  }, [currentProject]);

  async function loadData() {
    setIsLoading(true);
    const savedProjects = await getProjects();
    setProjects(savedProjects);

    const lastPath = await LocalStorage.getItem<string>(LAST_PROJECT_KEY);
    let selected = savedProjects.length > 0 ? savedProjects[0] : null;

    if (lastPath) {
      const match = savedProjects.find((p) => p.path === lastPath);
      if (match) selected = match;
    }

    setCurrentProject(selected);
    setIsLoading(false);
  }

  async function handleProjectChange(projectId: string) {
    const project = projects.find((p) => p.path === projectId);
    if (project) {
      setCurrentProject(project);
      await LocalStorage.setItem(LAST_PROJECT_KEY, project.path);
    }
  }

  async function readLog(projectPath: string) {
    setIsLoading(true);
    const logPath = path.join(projectPath, "storage", "logs", "laravel.log");
    if (fs.existsSync(logPath)) {
      try {
        // Read last 10KB
        const stats = fs.statSync(logPath);
        const size = stats.size;
        const maxSize = 10000;
        const start = Math.max(0, size - maxSize);
        const stream = fs.createReadStream(logPath, { start, end: size, encoding: "utf-8" });

        let data = "";
        for await (const chunk of stream) {
          data += chunk;
        }
        setLogContent(data);
      } catch (e) {
        setLogContent(`Error reading log: ${e}`);
      }
    } else {
      setLogContent("No laravel.log found in storage/logs/");
    }
    setIsLoading(false);
  }

  async function clearLog() {
    if (!currentProject) return;

    const confirmed = await confirmAlert({
      title: "Clear Log",
      message: "Are you sure you want to clear laravel.log?",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });

    if (confirmed) {
      const logPath = path.join(currentProject.path, "storage", "logs", "laravel.log");
      if (fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, "");
        readLog(currentProject.path);
        showToast({ style: Toast.Style.Success, title: "Log cleared" });
      }
    }
  }

  // If no project, show list to select one?
  // Consistence: Show Details view with specific Dropdown for project.

  return (
    <Detail
      isLoading={isLoading}
      markdown={logContent ? `\`\`\`log\n${logContent}\n\`\`\`` : "*Log is empty*"}
      navigationTitle={currentProject ? `Logs: ${currentProject.name}` : "Laravel Logs"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Project" text={currentProject?.name || "Select Project"} />
          <Detail.Metadata.Label title="Log File" text="storage/logs/laravel.log" />
          {currentProject && (
            <Detail.Metadata.Label
              title="Size"
              text={(() => {
                try {
                  const p = path.join(currentProject.path, "storage", "logs", "laravel.log");
                  if (fs.existsSync(p)) return (fs.statSync(p).size / 1024).toFixed(2) + " KB";
                } catch {
                  return "N/A";
                }
                return "0 KB";
              })()}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.RotateAntiClockwise}
              onAction={() => currentProject && readLog(currentProject.path)}
            />
            <Action title="Clear Log" icon={Icon.Trash} style={Action.Style.Destructive} onAction={clearLog} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Select Project">
            {projects.map((p) => (
              <Action
                key={p.path}
                title={`Switch to ${p.name}`}
                icon={Icon.Folder}
                onAction={() => handleProjectChange(p.path)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
