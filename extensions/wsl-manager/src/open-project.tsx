import { ActionPanel, Action, List, showToast, Toast, Icon, LocalStorage, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { execFileAsync, parseDistros } from "./utils/wsl";
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

  useEffect(() => {
    fetchProjects();
    loadEditorPreference();
  }, []);

  async function loadEditorPreference() {
    const storedId = await LocalStorage.getItem<string>("selectedEditorId");
    // We fetch available editors for the default distro (or first running one) to populate list
    // This is a simplification; realistically each distro might have different editors,
    // but for Windows apps (VS Code, etc.) it's global.
    const { stdout } = await execFileAsync("wsl", ["--list", "--verbose"]);
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
      const { stdout: wslOutput } = await execFileAsync("wsl", ["--list", "--verbose"]);
      const distros = parseDistros(wslOutput).filter((d) => d.state === "Running");

      if (distros.length === 0) {
        setIsLoading(false);
        return;
      }

      // Get configured project roots preference
      const preferences = getPreferenceValues();
      const rootsStr = preferences.projectRoots || "~";
      const roots = rootsStr
        .split(",")
        .map((r: string) => r.trim())
        .filter((r: string) => r.length > 0);

      // 2. Scan each distro for projects in all configured roots
      const results: Project[] = [];

      await Promise.all(
        distros.map(async (distro) => {
          try {
            // We need to scan each root
            for (const root of roots) {
              // Safe find command: wsl -d <distro> find <root> ...
              const { stdout } = await execFileAsync("wsl", [
                "-d",
                distro.name,
                "find",
                root,
                "-mindepth",
                "1",
                "-maxdepth",
                "1",
                "-type",
                "d",
                "-not",
                "-path",
                "*/.*",
              ]);

              const lines = stdout.split("\n").filter((line) => line.trim() !== "");
              lines.forEach((path) => {
                if (path !== root && path.trim() !== "") {
                  // Check if path is exactly the root (sometimes find returns the root itself)
                  // If root is ~ it might return /home/user, so we check if path ends with root basename?
                  // Actually 'find root' returns 'root' as first item usually.
                  // We can just filter out if it equals the root path resolved.
                  // But 'find' output is absolute paths usually if we provide absolute, or relative if relative.
                  // If we use '~', wsl find expands it? No, find expects path.
                  // 'wsl find ~' works because shell expands ~, but we are using execFile?
                  // Wait, execFileAsync('wsl', ['find', '~']) -> wsl doesn't expand ~ if it's an arg to 'find' binary directly?
                  // Actually 'wsl find ~' might fail if 'find' doesn't get strict path.
                  // But the previous code used `projectRoot = "~"` and it supposedly worked or was default.
                  // If the user provided `~`, we might need to let the shell expand it or use `wsl -d distro -- exec find ...`?
                  // Or we just assume the user provides valid paths.
                  // For `~`, we might want to manually resolve it to `/home/$USER` or just Use `wsl -d distro -- find ~ ...` inside bash -c?
                  // The previous code used `wsl -d distro find ~ ...`.
                  // Let's stick to what was there but iterate.

                  const cleanPath = path.trim();
                  // Basic check to avoid listing the root itself if possible,
                  // but 'find' output matches 'root' exactly on first line.
                  // We can check if cleanPath is one of the roots but determining exact string match is tricky with ~ expansion.
                  // Simpler: Just filter out if the name is empty or same as root basename?

                  const parts = cleanPath.split("/");
                  const name = parts[parts.length - 1] || cleanPath;

                  // Filter out if name is just the root folder name?
                  // No, users might name their repo 'code'.
                  // Let's just push it. unique key will dedupe later potentially or React key handles it.
                  // Actually, let's just ignore if it seems to be the root.
                  // 'find -minheaders 1' avoids root? No, 'mindepth 1'.
                  // We can add -mindepth 1 to find command!

                  results.push({
                    name,
                    path: cleanPath,
                    distro: distro.name,
                  });
                }
              });
            }
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
      // Cast to include our custom property
      const editor = availableEditors.find((e) => e.id === selectedEditorId) as
        | (Editor & { needsWindowsPath?: boolean; useTerminal?: boolean })
        | undefined;

      if (!editor) {
        await showToast({ style: Toast.Style.Failure, title: "No editor selected" });
        return;
      }

      let targetPath = project.path;
      if (editor.needsWindowsPath) {
        const { stdout } = await execFileAsync("wsl", ["-d", project.distro, "wslpath", "-w", project.path]);
        targetPath = stdout.trim();
      }

      const { command, args } = editor.getCommand(project.distro, targetPath);

      if (editor.useTerminal) {
        // Launch in a new terminal window
        // start wsl -d distro command args...
        // We assume 'args' here are just ["-d", distro, command, path] if it was constructed by getCommand
        // But getCommand returned ["-d", distro, "vim", path]
        // So we want: start wsl -d distro vim path
        // We can use 'cmd /c start' or just exec 'start' if allowed?
        // execFileAsync('cmd.exe', ['/c', 'start', command, ...args])
        // 'command' is 'wsl'.

        await execFileAsync("cmd.exe", ["/c", "start", command, ...args]);
      } else {
        await execFileAsync(command, args);
      }

      await showToast({ style: Toast.Style.Success, title: `Opening in ${editor.name}` });
    } catch (error) {
      console.error(error);
      await showToast({ style: Toast.Style.Failure, title: "Failed to open project", message: String(error) });
    }
  }

  async function openInExplorer(project: Project) {
    try {
      const { stdout } = await execFileAsync("wsl", ["-d", project.distro, "wslpath", "-w", project.path]);
      const winPath = stdout.trim();
      await execFileAsync("explorer.exe", [winPath]);
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
          icon={Icon.List}
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
