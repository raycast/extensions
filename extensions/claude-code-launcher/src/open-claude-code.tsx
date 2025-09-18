import {
  ActionPanel,
  Action,
  List,
  LocalStorage,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  Form,
  useNavigation,
  confirmAlert,
  Keyboard,
  Alert,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { PROJECT_ICON_NAMES, getIcon } from "./project-icons";
import { getTerminalAdapter } from "./terminal-adapters";
import { useState, useEffect, useMemo } from "react";
import { randomUUID } from "crypto";
import { homedir } from "os";
import path from "path";
import { access, constants } from "fs/promises";

const STORAGE_KEY = "claude-code-projects";
const CURRENT_VERSION = 1;


interface Project {
  id: string;
  path: string;
  name?: string;
  icon?: string;
  addedAt: Date;
  lastOpened?: Date;
  openCount: number;
}

interface ProjectsState {
  projects: Project[];
  version: number;
}

function showSuccessToast(title: string, message?: string) {
  showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

function getRelativeTime(date: Date | undefined): string {
  if (!date) return "Never";

  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }
  if (seconds < 2592000) {
    const weeks = Math.floor(seconds / 604800);
    if (weeks === 1) return "Last week";
    return `${weeks} weeks ago`;
  }
  const months = Math.floor(seconds / 2592000);
  if (months === 1) return "Last month";
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

function expandTilde(filepath: string): string {
  if (filepath.startsWith("~/")) {
    return path.join(homedir(), filepath.slice(2));
  }
  return filepath;
}

function getDirectoryName(dirPath: string): string {
  return path.basename(dirPath) || path.dirname(dirPath);
}

async function openInTerminal(project: Project, preferences: Preferences, onSuccess: () => void): Promise<void> {
  const expandedPath = expandTilde(project.path);

  try {
    try {
      await access(expandedPath, constants.R_OK);
    } catch {
      throw new Error(`Cannot access directory: ${expandedPath}. It may have been moved or deleted.`);
    }

    const adapter = getTerminalAdapter(preferences.terminalApp);

    if (!adapter) {
      throw new Error(`Unsupported terminal: ${preferences.terminalApp}`);
    }

    await adapter.open(expandedPath);
    onSuccess();
    showSuccessToast("Opened in Terminal", project.name || getDirectoryName(project.path));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await showFailureToast(errorMessage, {
      title: "Failed to open terminal",
    });
  }
}

function IconDropdown({
  value,
  onChange,
  defaultValue,
}: {
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
}) {
  return (
    <Form.Dropdown id="icon" title="Icon" value={value} onChange={onChange} defaultValue={defaultValue}>
      {PROJECT_ICON_NAMES.map((iconName) => (
        <Form.Dropdown.Item key={iconName} value={iconName} title={iconName} icon={getIcon(iconName)} />
      ))}
    </Form.Dropdown>
  );
}

function AddProjectForm({
  onAdd,
  existingPaths,
  defaultIcon,
}: {
  onAdd: (project: Project) => void;
  existingPaths: string[];
  defaultIcon: string;
}) {
  const { pop } = useNavigation();
  const [paths, setPaths] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [pathError, setPathError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [, setIsValidating] = useState(false);

  const validatePaths = async (pathValues: string[]): Promise<string | undefined> => {
    if (!pathValues || pathValues.length === 0) {
      return "Please select a directory";
    }

    const pathValue = pathValues[0];
    if (!pathValue) {
      return "Please select a directory";
    }

    if (existingPaths.includes(pathValue)) {
      return "This directory is already in your projects";
    }

    try {
      await access(pathValue, constants.R_OK);
      const stats = await import("fs/promises").then((fs) => fs.stat(pathValue));
      if (!stats.isDirectory()) {
        return "Path must be a directory";
      }
    } catch {
      return "Directory does not exist or is not accessible";
    }

    return undefined;
  };

  const validateName = (nameValue: string): string | undefined => {
    if (nameValue.length > 100) {
      return "Name must be 100 characters or less";
    }
    return undefined;
  };

  const handleSubmit = async (values: { path: string[]; name: string; icon: string }) => {
    setIsValidating(true);

    const pathValidationError = await validatePaths(values.path);
    const nameValidationError = validateName(values.name);

    if (pathValidationError || nameValidationError) {
      setPathError(pathValidationError);
      setNameError(nameValidationError);
      setIsValidating(false);
      return;
    }

    const selectedPath = values.path[0];
    const newProject: Project = {
      id: randomUUID(),
      path: selectedPath,
      name: values.name || undefined,
      icon: values.icon || defaultIcon,
      addedAt: new Date(),
      openCount: 0,
    };

    onAdd(newProject);
    pop();
    showSuccessToast("Added Project", newProject.name || getDirectoryName(newProject.path));
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="path"
        title="Project Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        value={paths}
        error={pathError}
        onChange={async (newPaths) => {
          setPaths(newPaths);
          if (newPaths && newPaths.length > 0) {
            const error = await validatePaths(newPaths);
            setPathError(error);
          } else {
            setPathError(undefined);
          }
        }}
      />
      <Form.TextField
        id="name"
        title="Name (Optional)"
        placeholder="My Project"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
        onBlur={(event) => {
          const error = validateName(event.target.value || "");
          setNameError(error);
        }}
      />
      <IconDropdown defaultValue={defaultIcon} />
    </Form>
  );
}

function EditProjectForm({
  project,
  onEdit,
  defaultIcon,
}: {
  project: Project;
  onEdit: (project: Project) => void;
  defaultIcon: string;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(project.name || "");
  const [icon, setIcon] = useState(project.icon || defaultIcon);
  const [nameError, setNameError] = useState<string | undefined>();

  const validateName = (nameValue: string): string | undefined => {
    if (nameValue.length > 100) {
      return "Name must be 100 characters or less";
    }
    return undefined;
  };

  const handleSubmit = (values: { name: string; icon: string }) => {
    const nameValidationError = validateName(values.name);

    if (nameValidationError) {
      setNameError(nameValidationError);
      return;
    }

    const updatedProject = {
      ...project,
      name: values.name || undefined,
      icon: values.icon || defaultIcon,
    };

    onEdit(updatedProject);
    pop();
    showSuccessToast("Updated Project", updatedProject.name || getDirectoryName(updatedProject.path));
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Path: ${project.path}`} />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Project"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
        onBlur={(event) => {
          const error = validateName(event.target.value || "");
          setNameError(error);
        }}
      />
      <IconDropdown value={icon} onChange={setIcon} />
    </Form>
  );
}

async function checkDependencies(preferences: Preferences): Promise<void> {
  const adapter = getTerminalAdapter(preferences.terminalApp);
  if (!adapter) {
    await showFailureToast(`Unsupported terminal: ${preferences.terminalApp}`, {
      title: "Terminal Not Supported",
      message: "Please select a supported terminal in preferences.",
    });
    throw new Error(`Unsupported terminal: ${preferences.terminalApp}`);
  }
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setDependenciesValid] = useState(true);

  useEffect(() => {
    checkDependencies(preferences)
      .then(() => setDependenciesValid(true))
      .catch(() => setDependenciesValid(false))
      .finally(() => loadProjects());
  }, []);

  const loadProjects = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (stored) {
        let state: ProjectsState;
        try {
          state = JSON.parse(stored);
        } catch (parseError) {
          console.error("Failed to parse projects data:", parseError);
          await showFailureToast("Projects data is corrupted. Resetting to empty list.", {
            title: "Corrupted Data",
            message: "Your projects data was corrupted and has been reset.",
          });
          await LocalStorage.removeItem(STORAGE_KEY);
          setProjects([]);
          return;
        }

        if (!state.projects || !Array.isArray(state.projects)) {
          console.error("Invalid projects structure");
          await showFailureToast("Invalid projects data structure. Resetting to empty list.", {
            title: "Invalid Data",
            message: "Your projects data structure was invalid and has been reset.",
          });
          await LocalStorage.removeItem(STORAGE_KEY);
          setProjects([]);
          return;
        }

        const projects = state.projects
          .filter((proj) => proj && proj.id && proj.path)
          .map((proj) => ({
            ...proj,
            addedAt: new Date(proj.addedAt),
            lastOpened: proj.lastOpened ? new Date(proj.lastOpened) : undefined,
            openCount: proj.openCount || 0,
            icon: proj.icon || "Folder",
          }));
        setProjects(projects);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      await showFailureToast(error, {
        title: "Failed to load projects",
        message: "An unexpected error occurred while loading projects.",
      });
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProjects = async (newProjects: Project[]) => {
    try {
      const state: ProjectsState = {
        projects: newProjects,
        version: CURRENT_VERSION,
      };
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setProjects(newProjects);
    } catch (error) {
      console.error("Failed to save projects:", error);
      await showFailureToast(error, {
        title: "Failed to save projects",
      });
    }
  };

  const addProject = async (project: Project) => {
    const newProjects = [...projects, project];
    await saveProjects(newProjects);
  };

  const updateProject = async (updatedProject: Project) => {
    const newProjects = projects.map((proj) => (proj.id === updatedProject.id ? updatedProject : proj));
    await saveProjects(newProjects);
  };

  const removeProject = async (projectId: string) => {
    const newProjects = projects.filter((proj) => proj.id !== projectId);
    await saveProjects(newProjects);
  };

  const markAsOpened = async (projectId: string) => {
    const newProjects = projects.map((proj) =>
      proj.id === projectId
        ? {
            ...proj,
            lastOpened: new Date(),
            openCount: proj.openCount + 1,
          }
        : proj,
    );
    await saveProjects(newProjects);
  };

  const filteredAndSortedProjects = useMemo(() => {
    const searchLower = searchText.toLowerCase();

    const matchesSearch = (project: Project) => {
      if (!searchText) return true;

      const searchableText = [
        project.name?.toLowerCase(),
        project.path.toLowerCase(),
        getDirectoryName(project.path).toLowerCase(),
      ]
        .filter(Boolean)
        .join(" ");

      return searchableText.includes(searchLower);
    };

    const compareByRecency = (a: Project, b: Project) => {
      if (a.lastOpened && b.lastOpened) {
        return b.lastOpened.getTime() - a.lastOpened.getTime();
      }
      if (a.lastOpened) return -1;
      if (b.lastOpened) return 1;
      return 0;
    };

    const compareByUsage = (a: Project, b: Project) => b.openCount - a.openCount;

    const compareByName = (a: Project, b: Project) => {
      const nameA = a.name || getDirectoryName(a.path);
      const nameB = b.name || getDirectoryName(b.path);
      return nameA.localeCompare(nameB);
    };

    return projects
      .filter(matchesSearch)
      .sort((a, b) => compareByRecency(a, b) || compareByUsage(a, b) || compareByName(a, b));
  }, [projects, searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search projects..."
      searchText={searchText}
    >
      {filteredAndSortedProjects.length === 0 && !searchText ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No Projects Yet"
          description="Press ⌘N to add your first project directory"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Project"
                icon={Icon.Plus}
                target={
                  <AddProjectForm
                    onAdd={addProject}
                    existingPaths={projects.map((p) => p.path)}
                    defaultIcon={preferences.defaultProjectIcon}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      ) : filteredAndSortedProjects.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Projects Found"
          description={`No projects matching "${searchText}"`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Project"
                icon={Icon.Plus}
                target={
                  <AddProjectForm
                    onAdd={addProject}
                    existingPaths={projects.map((p) => p.path)}
                    defaultIcon={preferences.defaultProjectIcon}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Projects" subtitle={`${filteredAndSortedProjects.length} items`}>
          {filteredAndSortedProjects.map((project) => (
            <List.Item
              key={project.id}
              icon={getIcon(project.icon || preferences.defaultProjectIcon, preferences.defaultProjectIcon)}
              title={project.name || getDirectoryName(project.path)}
              subtitle={project.name ? project.path : undefined}
              accessories={[
                {
                  text: getRelativeTime(project.lastOpened),
                  tooltip: project.lastOpened ? `Last opened: ${project.lastOpened.toLocaleString()}` : "Never opened",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Open in ${preferences.terminalApp}`}
                    icon={Icon.Terminal}
                    onAction={() => openInTerminal(project, preferences, () => markAsOpened(project.id))}
                  />
                  <Action.Push
                    title="Edit Project"
                    icon={Icon.Pencil}
                    target={
                      <EditProjectForm
                        project={project}
                        onEdit={updateProject}
                        defaultIcon={preferences.defaultProjectIcon}
                      />
                    }
                    shortcut={Keyboard.Shortcut.Common.Edit}
                  />
                  <Action
                    title="Remove Project"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const options: Alert.Options = {
                        title: "Remove Project",
                        message: `Are you sure you want to remove "${project.name || getDirectoryName(project.path)}"?`,
                        primaryAction: {
                          title: "Remove",
                          style: Alert.ActionStyle.Destructive,
                          onAction: () => {
                            removeProject(project.id);
                            showSuccessToast("Removed Project");
                          },
                        },
                      };
                      await confirmAlert(options);
                    }}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Add Project"
                      icon={Icon.Plus}
                      target={
                        <AddProjectForm
                          onAdd={addProject}
                          existingPaths={projects.map((p) => p.path)}
                          defaultIcon={preferences.defaultProjectIcon}
                        />
                      }
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={project.path}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action.ShowInFinder
                      title="Show in Finder"
                      path={expandTilde(project.path)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
