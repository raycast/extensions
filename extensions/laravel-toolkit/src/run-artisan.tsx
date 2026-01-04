import {
  ActionPanel,
  List,
  Action,
  showToast,
  Toast,
  Icon,
  LocalStorage,
  useNavigation,
  Form,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { getProjects, saveProject, Project } from "./utils/projects";
import { getEditorApp } from "./utils/editor";
import { getArtisanCommands, ArtisanCommand } from "./utils/artisan";

const execAsync = promisify(exec);
const LAST_PROJECT_KEY = "last-active-project";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [commands, setCommands] = useState<ArtisanCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // When project changes, fetch its commands
  useEffect(() => {
    if (currentProject) {
      fetchCommands(currentProject.path);
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

  async function fetchCommands(path: string) {
    setIsLoading(true);
    const cmds = await getArtisanCommands(path);
    setCommands(cmds);
    setIsLoading(false);
  }

  async function handleProjectChange(projectId: string) {
    const project = projects.find((p) => p.path === projectId);
    if (project) {
      setCurrentProject(project);
      await LocalStorage.setItem(LAST_PROJECT_KEY, project.path);
    }
  }

  async function runArtisan(command: string) {
    if (!currentProject) return;

    setIsLoading(true);
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Running: php artisan ${command}`,
      });

      const { stdout } = await execAsync(`cd "${currentProject.path.replace(/"/g, '\\"')}" && php artisan ${command}`);

      toast.style = Toast.Style.Success;
      toast.title = "Command completed";
      toast.message = stdout.slice(0, 100);

      if (command === "serve") {
        toast.message = "Server likely running (check terminal)";
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Command failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function importProject(path: string) {
    const name = path.split("\\").pop() || path.split("/").pop() || "Untitled";
    const newProject: Project = {
      name,
      path,
      createdAt: new Date().toISOString(),
    };
    await saveProject(newProject);
    setProjects(await getProjects());
    setCurrentProject(newProject);
    await LocalStorage.setItem(LAST_PROJECT_KEY, newProject.path);
    showToast({ style: Toast.Style.Success, title: "Project Imported", message: name });
    return true;
  }

  const editorApp = getEditorApp();

  // Group commands by namespace
  const groupedCommands = commands.reduce(
    (acc, cmd) => {
      const parts = cmd.name.split(":");
      const namespace = parts.length > 1 ? parts[0] : "General";
      if (!acc[namespace]) acc[namespace] = [];
      acc[namespace].push(cmd);
      return acc;
    },
    {} as Record<string, ArtisanCommand[]>,
  );

  const categories = Object.keys(groupedCommands).sort();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={currentProject ? `Run Artisan in ${currentProject.name}...` : "Select a project..."}
      searchBarAccessory={
        projects.length > 0 ? (
          <List.Dropdown tooltip="Select Project" onChange={handleProjectChange} value={currentProject?.path}>
            {projects.map((p) => (
              <List.Dropdown.Item key={p.path} title={p.name} value={p.path} icon={Icon.Folder} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Projects Found"
          description="Add a Laravel project to start running commands."
          actions={
            <ActionPanel>
              <Action.Push
                title="Import Project"
                icon={Icon.Plus}
                target={<ImportProjectForm onImport={importProject} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        categories.map((category) => (
          <List.Section key={category} title={category.charAt(0).toUpperCase() + category.slice(1)}>
            {groupedCommands[category].map((cmd) => (
              <List.Item
                key={cmd.name}
                icon={Icon.Terminal}
                title={cmd.name}
                subtitle={cmd.description}
                accessories={[{ tag: { value: "Artisan", color: Color.Red } }]}
                keywords={[category, ...cmd.name.split(":")]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action title="Run Command" icon={Icon.Play} onAction={() => runArtisan(cmd.name)} />
                      <Action.CopyToClipboard title="Copy Command" content={`php artisan ${cmd.name}`} />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Project Actions">
                      <Action.Push
                        title="Import Another Project"
                        icon={Icon.Plus}
                        target={<ImportProjectForm onImport={importProject} />}
                      />
                      {currentProject && editorApp && (
                        <Action.Open
                          title={`Open ${currentProject.name} in ${editorApp.name}`}
                          target={currentProject.path}
                          application={editorApp}
                        />
                      )}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function ImportProjectForm({ onImport }: { onImport: (path: string) => Promise<boolean> }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { folder: string[] }) {
    if (values.folder && values.folder.length > 0) {
      const success = await onImport(values.folder[0]);
      if (success) {
        pop();
      }
    } else {
      showToast({ style: Toast.Style.Failure, title: "No folder selected" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Project" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Project Folder"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />
    </Form>
  );
}
