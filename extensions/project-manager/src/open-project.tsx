import { Action, ActionPanel, List, showToast, Toast, open, Icon, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { getProjects, Project } from "./utils/storage";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default function OpenProject() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getEditorName(editor: string): string {
    const editorNames: Record<string, string> = {
      cursor: "Cursor",
      vscode: "Visual Studio Code",
      zed: "Zed",
      webstorm: "WebStorm",
      sublime: "Sublime Text",
    };
    return editorNames[editor] || editor;
  }

  async function openInEditor(project: Project) {
    try {
      // Si un fichier workspace existe, l'ouvrir, sinon ouvrir le dossier
      const targetPath = project.workspaceFile || project.path;
      const editorApp = getEditorName(project.editor);

      await open(targetPath, editorApp);
      await showToast({
        style: Toast.Style.Success,
        title: `Opened in ${editorApp}`,
        message: project.workspaceFile ? `${project.name} (workspace)` : project.name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to open ${getEditorName(project.editor)}`,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function openInTerminal(project: Project) {
    try {
      let command = "";
      const ccCommand = project.claudeCodeCommand || "cc";

      switch (project.terminal) {
        case "ghostty":
          // Ghostty: ouvre l'app, active-la puis envoie les commandes
          command = `open -na Ghostty && sleep 0.5 && osascript -e 'tell application "Ghostty" to activate' -e 'delay 0.3' -e 'tell application "System Events" to keystroke "cd ${project.path.replace(/"/g, '\\"')} && ${ccCommand}"' -e 'tell application "System Events" to keystroke return'`;
          break;
        case "iterm":
          command = `osascript -e 'tell application "iTerm"
            create window with default profile
            tell current session of current window
              write text "cd '${project.path}' && ${ccCommand}"
            end tell
          end tell'`;
          break;
        case "terminal":
          command = `osascript -e 'tell application "Terminal"
            do script "cd '${project.path}' && ${ccCommand}"
            activate
          end tell'`;
          break;
      }

      await execAsync(command);
      await showToast({
        style: Toast.Style.Success,
        title: `Opened in ${project.terminal}`,
        message: `${project.name} with Claude Code`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open terminal",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function openBoth(project: Project) {
    await openInEditor(project);
    await openInTerminal(project);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No projects yet"
          description="Use 'Add Project' to add your first project"
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.id}
            title={project.name}
            subtitle={project.path}
            accessories={[
              ...(project.workspaceFile ? [{ icon: Icon.Document, tooltip: "Has workspace file" }] : []),
              { tag: { value: project.editor, color: "#32D74B" } },
              { text: project.terminal },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Open Project">
                  <Action title="Open Both" onAction={() => openBoth(project)} icon={Icon.Bolt} />
                  <Action
                    title={`Open in ${getEditorName(project.editor)} Only`}
                    onAction={() => openInEditor(project)}
                    icon={Icon.Code}
                  />
                  <Action
                    title="Open in Terminal + Claude Code"
                    onAction={() => openInTerminal(project)}
                    icon={Icon.Terminal}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage">
                  <Action
                    title="Edit Project"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={async () => {
                      await launchCommand({ name: "edit-project", type: LaunchType.UserInitiated });
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
