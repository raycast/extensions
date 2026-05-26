import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import tildify from "tildify";

import { getExtensionPreferences, type AppPreferences } from "./preferences";
import { loadProjects } from "./project-manager/load-projects";
import { resolveProjectManagerStorage } from "./project-manager/resolve-storage";
import {
  clearProjectCommand,
  getCommandOverrides,
  resolveProjectCommand,
  setProjectCommand,
  type ProjectCommandOverrides,
} from "./storage/command-overrides";
import { execFileAsync } from "./terminal/exec";
import { getTerminalLauncher, launchInTerminal } from "./terminal";
import type {
  CommandMode,
  NormalizedProject,
  StorageResolution,
} from "./types";
import { ExtensionError } from "./ui/extension-error";

interface LoadedState {
  isLoading: boolean;
  storage?: StorageResolution;
  projects: NormalizedProject[];
  overrides: ProjectCommandOverrides;
  error?: string;
}

interface CommandFormValues {
  command: string;
}

const NO_TAG = "[no tags]";

async function loadState(
  preferences: AppPreferences,
): Promise<Omit<LoadedState, "isLoading">> {
  const storage = resolveProjectManagerStorage(preferences);
  if (storage.error) {
    return {
      storage,
      projects: [],
      overrides: {},
      error: storage.error,
    };
  }

  const [projectsResult, overrides] = await Promise.all([
    loadProjects(storage.projectsJsonPath, preferences),
    getCommandOverrides(),
  ]);

  return {
    storage,
    projects: projectsResult.projects,
    overrides,
    error: projectsResult.error,
  };
}

function getProjectKey(project: NormalizedProject): string {
  return project.rootPath;
}

function getProjectAccessories(
  project: NormalizedProject,
  overrides: ProjectCommandOverrides,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (overrides[getProjectKey(project)]) {
    accessories.push({
      icon: Icon.Hammer,
      tooltip: "Project command override",
    });
  }

  if (project.isRemote) {
    accessories.push({
      text: "Remote",
      icon: Icon.Cloud,
      tooltip: "Remote projects cannot be opened in a local terminal",
    });
  } else if (!project.exists) {
    accessories.push({
      text: "Missing",
      icon: Icon.ExclamationMark,
      tooltip: "Path does not exist",
    });
  }

  if (project.tags.length > 0) {
    accessories.push({ text: project.tags.join(", ") });
  }

  return accessories;
}

function groupProjects(
  projects: NormalizedProject[],
): Map<string, NormalizedProject[]> {
  const grouped = new Map<string, NormalizedProject[]>();

  for (const project of projects) {
    const tags = project.tags.length > 0 ? project.tags : [NO_TAG];
    for (const tag of tags) {
      grouped.set(tag, [...(grouped.get(tag) ?? []), project]);
    }
  }

  return new Map([...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function openInVSCode(
  project: NormalizedProject,
  preferences: AppPreferences,
): Promise<void> {
  const appName = preferences.vscodeApp?.name || "Visual Studio Code";
  await execFileAsync("open", ["-a", appName, project.rootPath]);
}

function CommandForm({
  title,
  initialCommand,
  submitTitle,
  onSubmit,
}: {
  title: string;
  initialCommand?: string;
  submitTitle: string;
  onSubmit(command: string): Promise<void>;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm<CommandFormValues>
            title={submitTitle}
            onSubmit={async (values) => {
              await onSubmit(values.command);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="command"
        title="Command"
        defaultValue={initialCommand}
        placeholder="claude"
        autoFocus
      />
    </Form>
  );
}

function ProjectActions({
  project,
  preferences,
  overrides,
  updateOverrides,
}: {
  project: NormalizedProject;
  preferences: AppPreferences;
  overrides: ProjectCommandOverrides;
  updateOverrides(overrides: ProjectCommandOverrides): void;
}) {
  const launcher = getTerminalLauncher(preferences.terminalType);
  const projectKey = getProjectKey(project);
  const storedCommand = overrides[projectKey] ?? "";
  const resolvedCommand = resolveProjectCommand(
    overrides,
    projectKey,
    preferences.defaultCommand,
  );

  async function launch(
    rawCommand: string | undefined,
    mode: CommandMode = preferences.commandMode ?? "keepShell",
  ) {
    if (project.isRemote) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Remote project",
        message:
          "Remote VS Code projects cannot be opened in a local terminal yet.",
      });
      return;
    }

    if (!project.exists) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Path does not exist",
        message: project.cwd,
      });
      return;
    }

    try {
      await launchInTerminal(preferences.terminalType, {
        project,
        cwd: project.cwd,
        rawCommand,
        commandMode: mode,
        reuseWindow: preferences.reuseWindow ?? false,
        shellPath: preferences.shellPath || "/bin/zsh",
      });
      await showToast({
        style: Toast.Style.Success,
        title: `Opened in ${launcher.title}`,
        message: project.name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to open ${launcher.title}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={`Open in ${launcher.title}`}
          icon={Icon.Terminal}
          onAction={() => launch(resolvedCommand)}
        />
        <Action
          title="Open Without Command"
          icon={Icon.Window}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          onAction={() => launch(undefined, "none")}
        />
        <Action.Push
          title="Open with Custom Command…"
          icon={Icon.TextCursor}
          shortcut={{ modifiers: ["opt"], key: "enter" }}
          target={
            <CommandForm
              title={`Open ${project.name} With Command`}
              initialCommand={resolvedCommand}
              submitTitle="Open Workspace"
              onSubmit={(command) => launch(command)}
            />
          }
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Command Override">
        <Action.Push
          title="Set Project Command…"
          icon={Icon.Hammer}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          target={
            <CommandForm
              title={`Set Command for ${project.name}`}
              initialCommand={storedCommand || preferences.defaultCommand}
              submitTitle="Save Command"
              onSubmit={async (command) => {
                const next = await setProjectCommand(projectKey, command);
                updateOverrides(next);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Project command saved",
                  message: project.name,
                });
              }}
            />
          }
        />
        {storedCommand ? (
          <Action
            title="Clear Project Command"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              const next = await clearProjectCommand(projectKey);
              updateOverrides(next);
              await showToast({
                style: Toast.Style.Success,
                title: "Project command cleared",
                message: project.name,
              });
            }}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Path">
        <Action.CopyToClipboard
          title="Copy Path"
          content={project.cwd}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        {!project.isRemote && project.exists ? (
          <Action.ShowInFinder title="Show in Finder" path={project.cwd} />
        ) : null}
        <Action
          title="Open in VS Code"
          icon={Icon.Code}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={async () => {
            try {
              await openInVSCode(project, preferences);
            } catch (error) {
              await Clipboard.copy(project.rootPath);
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to open VS Code",
                message:
                  error instanceof Error
                    ? error.message
                    : "Path copied instead.",
              });
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ProjectItem({
  project,
  preferences,
  overrides,
  updateOverrides,
}: {
  project: NormalizedProject;
  preferences: AppPreferences;
  overrides: ProjectCommandOverrides;
  updateOverrides(overrides: ProjectCommandOverrides): void;
}) {
  const subtitle = project.isRemote ? project.rootPath : tildify(project.cwd);

  return (
    <List.Item
      id={project.id}
      title={project.name}
      subtitle={subtitle}
      icon={project.isRemote ? Icon.Cloud : { fileIcon: project.cwd }}
      keywords={project.tags}
      accessories={getProjectAccessories(project, overrides)}
      actions={
        <ProjectActions
          project={project}
          preferences={preferences}
          overrides={overrides}
          updateOverrides={updateOverrides}
        />
      }
    />
  );
}

export default function Command() {
  const preferences = useMemo(() => getExtensionPreferences(), []);
  const [state, setState] = useState<LoadedState>({
    isLoading: true,
    projects: [],
    overrides: {},
  });

  useEffect(() => {
    let cancelled = false;

    loadState(preferences)
      .then((loaded) => {
        if (!cancelled) {
          setState({ ...loaded, isLoading: false });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            isLoading: false,
            projects: [],
            overrides: {},
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [preferences]);

  const groupedProjects = useMemo(
    () => groupProjects(state.projects),
    [state.projects],
  );

  function updateOverrides(overrides: ProjectCommandOverrides) {
    setState((current) => ({ ...current, overrides }));
  }

  if (!state.isLoading && state.error) {
    return (
      <ExtensionError
        title="Project Manager data unavailable"
        message={`${state.error}\n\nOpen VS Code Project Manager and save at least one project, or configure the Project Manager data path in preferences.`}
        vscodeAppName={preferences.vscodeApp?.name}
        storagePath={state.storage?.storagePath}
        projectsJsonPath={state.storage?.projectsJsonPath}
        isDefaultPath={state.storage?.isDefault}
      />
    );
  }

  const emptyView = (
    <List.EmptyView
      icon={Icon.Folder}
      title="No Projects Found"
      description="Save a project in VS Code Project Manager or adjust Workspace Terminal preferences."
    />
  );

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Search Project Manager projects..."
      isShowingDetail={false}
    >
      {state.projects.length === 0 && !state.isLoading ? emptyView : null}
      {preferences.groupProjectsByTag
        ? [...groupedProjects.entries()].map(([tag, projects]) => (
            <List.Section key={tag} title={tag}>
              {projects.map((project) => (
                <ProjectItem
                  key={`${tag}:${project.id}`}
                  project={project}
                  preferences={preferences}
                  overrides={state.overrides}
                  updateOverrides={updateOverrides}
                />
              ))}
            </List.Section>
          ))
        : state.projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              preferences={preferences}
              overrides={state.overrides}
              updateOverrides={updateOverrides}
            />
          ))}
    </List>
  );
}
