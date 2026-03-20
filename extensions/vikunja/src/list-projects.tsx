import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  getPreferenceValues,
  useNavigation,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getProjects,
  getAllTasks,
  createProject,
  updateProject,
  deleteProject,
  Project,
  ProjectInput,
} from "./api";

function projectIcon(project: Project): { source: Icon; tintColor?: Color } {
  if (project.hex_color) {
    return { source: Icon.CircleFilled, tintColor: project.hex_color as Color };
  }
  return { source: Icon.List };
}

export default function ListProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { push } = useNavigation();

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const p = await getProjects();
      setProjects(p);
      setLoadError(null);

      try {
        const allTasks = await getAllTasks();
        const counts: Record<number, number> = {};
        for (const t of allTasks) {
          if (t.done) continue;
          counts[t.project_id] = (counts[t.project_id] ?? 0) + 1;
        }
        setTaskCounts(counts);
      } catch (error) {
        setTaskCounts({});
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load task counts",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setLoadError(message);
      setProjects([]);
      setTaskCounts({});
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const baseUrl = useMemo(() => {
    const { apiUrl } = getPreferenceValues<Preferences>();
    return apiUrl.replace(/\/+$/, "");
  }, []);

  const topLevel = projects.filter((p) => !p.parent_project_id);
  const subProjects = projects.filter((p) => p.parent_project_id);

  const parentMap = new Map(projects.map((p) => [p.id, p]));

  const showEmptyView =
    !isLoading && (loadError !== null || projects.length === 0);
  let emptyTitle = "No projects";
  let emptyDescription =
    "Create a project in Vikunja or use Create Project here (⌘N).";
  if (loadError) {
    emptyTitle = "Failed to load projects";
    emptyDescription = loadError;
  }

  async function handleArchiveToggle(project: Project) {
    try {
      await updateProject(project.id, { is_archived: !project.is_archived });
      showToast({
        style: Toast.Style.Success,
        title: project.is_archived ? "Project unarchived" : "Project archived",
      });
      loadProjects();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update project",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete(project: Project) {
    if (
      await confirmAlert({
        title: `Delete "${project.title}"?`,
        message:
          "This will delete the project and all its tasks. This cannot be undone.",
      })
    ) {
      try {
        await deleteProject(project.id);
        showToast({ style: Toast.Style.Success, title: "Project deleted" });
        loadProjects();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete project",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  function ProjectActions({ project }: { project: Project }) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Show Tasks"
            icon={Icon.List}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "list-tasks",
                  type: LaunchType.UserInitiated,
                  context: { projectId: project.id },
                });
              } catch {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to launch List Tasks",
                });
              }
            }}
          />
          <Action
            title="Create Project"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() =>
              push(<ProjectForm projects={projects} onSubmit={loadProjects} />)
            }
          />
          <Action
            title="Create Sub-Project"
            icon={Icon.PlusSquare}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            onAction={() =>
              push(
                <ProjectForm
                  parentProjectId={project.id}
                  projects={projects}
                  onSubmit={loadProjects}
                />,
              )
            }
          />
          <Action
            title="Edit Project"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() =>
              push(
                <ProjectForm
                  project={project}
                  projects={projects}
                  onSubmit={loadProjects}
                />,
              )
            }
          />
          <Action.OpenInBrowser
            title="Open in Vikunja"
            url={`${baseUrl}/projects/${project.id}`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action
            title={
              project.is_archived ? "Unarchive Project" : "Archive Project"
            }
            icon={Icon.Box}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
            onAction={() => handleArchiveToggle(project)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadProjects}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Delete Project"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => handleDelete(project)}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function renderProjectItem(project: Project) {
    const parent = project.parent_project_id
      ? parentMap.get(project.parent_project_id)
      : null;
    const count = taskCounts[project.id];
    const subtitle =
      count !== undefined
        ? `${count} open tasks`
        : project.description?.slice(0, 50);
    const accessories: List.Item.Accessory[] = [];
    if (parent) {
      accessories.push({ tag: parent.title });
    }
    if (project.identifier) {
      accessories.push({ text: project.identifier });
    }

    return (
      <List.Item
        key={project.id}
        title={project.title}
        subtitle={subtitle}
        icon={projectIcon(project)}
        accessories={accessories}
        actions={<ProjectActions project={project} />}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Create Project"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() =>
              push(<ProjectForm projects={projects} onSubmit={loadProjects} />)
            }
          />
        </ActionPanel>
      }
    >
      {showEmptyView ? (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          icon={loadError ? Icon.Warning : Icon.Folder}
        />
      ) : (
        <>
          <List.Section
            title="Projects"
            subtitle={`${topLevel.length} projects`}
          >
            {topLevel.map(renderProjectItem)}
          </List.Section>
          {subProjects.length > 0 && (
            <List.Section
              title="Sub-Projects"
              subtitle={`${subProjects.length} projects`}
            >
              {subProjects.map(renderProjectItem)}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function ProjectForm({
  project,
  parentProjectId,
  projects,
  onSubmit,
}: {
  project?: Project;
  parentProjectId?: number;
  projects: Project[];
  onSubmit: () => void;
}) {
  const { pop } = useNavigation();
  const isEditing = !!project;

  async function handleSubmit(values: {
    title: string;
    description: string;
    parent_project_id: string;
  }) {
    if (!values.title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    const input: ProjectInput = {
      title: values.title,
      description: values.description,
      parent_project_id: values.parent_project_id
        ? parseInt(values.parent_project_id)
        : null,
    };

    try {
      if (isEditing) {
        await updateProject(project.id, input);
        showToast({ style: Toast.Style.Success, title: "Project updated" });
      } else {
        await createProject(input);
        showToast({ style: Toast.Style.Success, title: "Project created" });
      }
      onSubmit();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: isEditing
          ? "Failed to update project"
          : "Failed to create project",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const defaultParent = isEditing
    ? String(project.parent_project_id ?? "")
    : parentProjectId
      ? String(parentProjectId)
      : "";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update Project" : "Create Project"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={project?.title ?? ""}
      />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={project?.description ?? ""}
      />
      <Form.Dropdown
        id="parent_project_id"
        title="Parent Project"
        defaultValue={defaultParent}
      >
        <Form.Dropdown.Item value="" title="None (Top-Level)" />
        {projects
          .filter((p) => p.id !== project?.id)
          .map((p) => (
            <Form.Dropdown.Item
              key={p.id}
              value={String(p.id)}
              title={p.title}
            />
          ))}
      </Form.Dropdown>
    </Form>
  );
}
