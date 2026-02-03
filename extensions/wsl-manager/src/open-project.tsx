import { ActionPanel, Action, List, showToast, Toast, Icon, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { execAsync, parseDistros } from "./utils/wsl";
import { getConfiguredEditors, Editor } from "./utils/editors";

interface Project {
  name: string;
  path: string;
  distro: string;
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEditorId, setSelectedEditorId] = useState<string | null>(null);
  const [availableEditors, setAvailableEditors] = useState<Editor[]>([]);

  // In a real app, this would be a user preference
  const projectRoot = "~";

  useEffect(() => {
    fetchProjects();
    loadEditorPreference();
  }, []);

  async function loadEditorPreference() {
    const storedId = await LocalStorage.getItem<string>("selectedEditorId");
    // We fetch available editors for the default distro (or first running one) to populate list
    // This is a simplification; realistically each distro might have different editors,
    // but for Windows apps (VS Code, etc.) it's global.
    const { stdout } = await execAsync("wsl --list --verbose");
    const distros = parseDistros(stdout).filter((d) => d.state === "Running");
    const defaultDistro = distros.length > 0 ? distros[0].name : "Ubuntu";

    const editors = await getConfiguredEditors(defaultDistro);
    setAvailableEditors(editors);

    if (storedId) {
      setSelectedEditorId(storedId);
    } else if (editors.length > 0) {
      // Default to first available (usually VS Code if installed)
      setSelectedEditorId(editors[0].id);
    }
  }

  async function setEditor(editorId: string) {
    await LocalStorage.setItem("selectedEditorId", editorId);
    setSelectedEditorId(editorId);
    await showToast({ style: Toast.Style.Success, title: "Editor Updated" });
  }

  async function fetchProjects() {
    try {
      // 1. Get all running distros
      const { stdout: wslOutput } = await execAsync("wsl --list --verbose");
      const distros = parseDistros(wslOutput).filter((d) => d.state === "Running");

      if (distros.length === 0) {
        setIsLoading(false);
        return;
      }

      // 2. Scan each distro for projects
      const results: Project[] = [];

      await Promise.all(
        distros.map(async (distro) => {
          try {
            const { stdout } = await execAsync(
              `wsl -d ${distro.name} find ${projectRoot} -maxdepth 1 -type d -not -path '*/.*'`,
            );

            const lines = stdout.split("\n").filter((line) => line.trim() !== "");
            lines.forEach((path) => {
              if (path !== projectRoot && path.trim() !== "") {
                const parts = path.split("/");
                const name = parts[parts.length - 1] || path;
                results.push({
                  name,
                  path: path.trim(),
                  distro: distro.name,
                });
              }
            });
          } catch (e) {
            console.error(`Failed to scan distro ${distro.name}`, e);
          }
        }),
      );

      setProjects(results);
      setIsLoading(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: String(error),
      });
      setIsLoading(false);
    }
  }

  async function openProject(project: Project) {
    try {
      const editor = availableEditors.find((e) => e.id === selectedEditorId);
      if (!editor) {
        await showToast({ style: Toast.Style.Failure, title: "No editor selected" });
        return;
      }

      const command = editor.commandTemplate.replace(/{distro}/g, project.distro).replace(/{path}/g, project.path);

      if (editor.isTerminal) {
        await execAsync(command); // It's a 'start wsl ...' command, so execAsync works
      } else {
        await execAsync(command);
      }

      await showToast({ style: Toast.Style.Success, title: `Opening in ${editor.name}` });
    } catch (error) {
      console.error(error);
      await showToast({ style: Toast.Style.Failure, title: "Failed to open project", message: String(error) });
    }
  }

  async function openInExplorer(project: Project) {
    try {
      const { stdout } = await execAsync(`wsl -d ${project.distro} wslpath -w "${project.path}"`);
      const winPath = stdout.trim();
      await execAsync(`explorer.exe "${winPath}"`);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to open Explorer", message: String(error) });
    }
  }

  const currentEditorName = availableEditors.find((e) => e.id === selectedEditorId)?.name || "Editor";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search projects (Opening in ${currentEditorName})...`}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Default Editor" value={selectedEditorId || ""} onChange={setEditor}>
          {availableEditors.map((editor) => (
            <List.Dropdown.Item
              key={editor.id}
              title={editor.name}
              value={editor.id}
              icon={editor.icon || (editor.isTerminal ? Icon.Terminal : Icon.Pencil)}
            />
          ))}
        </List.Dropdown>
      }
    >
      {projects.map((project) => (
        <List.Item
          key={`${project.distro}-${project.path}`}
          title={project.name}
          subtitle={`${project.distro}: ${project.path}`}
          icon="list-icon.png"
          actions={
            <ActionPanel>
              <Action title={`Open in ${currentEditorName}`} icon={Icon.Pencil} onAction={() => openProject(project)} />
              <Action title="Open in Explorer" icon={Icon.Finder} onAction={() => openInExplorer(project)} />

              <ActionPanel.Section title="Configure">
                <Action title="Refresh List" onAction={fetchProjects} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
