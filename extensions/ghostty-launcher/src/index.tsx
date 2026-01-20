import {
  ActionPanel,
  Action,
  List,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { homedir } from "os";
import { getRecentProjects, Project } from "./utils/projects";

interface Preferences {
  projectPaths: string;
  maxDepth: string;
  useShellHistory: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const projectPaths = preferences.projectPaths
    .split(",")
    .map((p) => p.trim())
    .map((p) => p.replace(/^~/, homedir()))
    .filter((p) => p.length > 0);

  const maxDepth = parseInt(preferences.maxDepth, 10) || 2;

  const {
    data: projects,
    isLoading,
    error,
  } = useCachedPromise(
    async () => {
      return getRecentProjects(
        projectPaths,
        maxDepth,
        preferences.useShellHistory,
      );
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load projects",
      message: error.message,
    });
  }

  const openInGhostty = async (projectPath: string) => {
    try {
      // Open Ghostty with the project directory
      // Ghostty can be opened via `open -a Ghostty` and we can set the working directory
      await open(projectPath, "com.mitchellh.ghostty");
    } catch (e) {
      // Fallback: try using the shell command
      try {
        const { exec } = await import("child_process");
        exec(`open -a Ghostty "${projectPath}"`);
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to open Ghostty",
          message: "Make sure Ghostty is installed",
        });
      }
    }
  };

  const openInTerminal = async (projectPath: string, app: string) => {
    try {
      await open(projectPath, app);
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to open ${app}`,
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects && projects.length > 0 ? (
        projects.map((project) => (
          <List.Item
            key={project.path}
            title={project.name}
            subtitle={project.relativePath}
            icon={getProjectIcon(project)}
            accessories={[
              { text: project.source, icon: Icon.Clock },
              { date: project.lastModified },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Open in Ghostty"
                    icon={Icon.Terminal}
                    onAction={() => openInGhostty(project.path)}
                  />
                  <Action.OpenWith path={project.path} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.ShowInFinder path={project.path} />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={project.path}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Open in Other Terminals">
                  <Action
                    title="Open in Terminal"
                    icon={Icon.Terminal}
                    onAction={() => openInTerminal(project.path, "Terminal")}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                  <Action
                    title="Open in iTerm"
                    icon={Icon.Terminal}
                    onAction={() => openInTerminal(project.path, "iTerm")}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="No Projects Found"
          description="Add project directories in extension preferences"
          icon={Icon.Folder}
        />
      )}
    </List>
  );
}

function getProjectIcon(project: Project): Icon {
  if (project.projectType === "git") return Icon.Globe;
  if (project.projectType === "node") return Icon.Box;
  if (project.projectType === "rust") return Icon.Hammer;
  if (project.projectType === "python") return Icon.Code;
  if (project.projectType === "go") return Icon.Code;
  return Icon.Folder;
}
