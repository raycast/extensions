import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  useNavigation,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "./utils/storage";
import { Project } from "./utils/types";

export default function ManageProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  async function loadProjects() {
    try {
      const projectsList = await getProjects(true);
      setProjects(projectsList);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleDelete(id: string, name: string) {
    const confirmed = await confirmAlert({
      title: "Delete Project",
      message: `Are you sure you want to delete "${name}"? All associated time entries will also be deleted.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await deleteProject(id);
      await showToast({
        style: Toast.Style.Success,
        title: "Project deleted",
        message: name,
      });
      await loadProjects();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete project",
        message: String(error),
      });
    }
  }

  async function handleToggleArchive(project: Project) {
    try {
      await updateProject(project.id, { archived: !project.archived });
      await showToast({
        style: Toast.Style.Success,
        title: project.archived ? "Project unarchived" : "Project archived",
        message: project.name,
      });
      await loadProjects();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update project",
        message: String(error),
      });
    }
  }

  const filteredProjects = showArchived
    ? projects
    : projects.filter((p) => !p.archived);
  const activeCount = projects.filter((p) => !p.archived).length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Projects"
          value={showArchived ? "all" : "active"}
          onChange={(value) => setShowArchived(value === "all")}
        >
          <List.Dropdown.Item
            title={`Active (${activeCount})`}
            value="active"
          />
          <List.Dropdown.Item title={`All (${projects.length})`} value="all" />
        </List.Dropdown>
      }
    >
      {filteredProjects.length === 0 ? (
        <List.EmptyView
          title="No projects"
          description="Create your first project to start tracking time"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Project"
                icon={Icon.Plus}
                target={<CreateProjectForm onSave={loadProjects} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {filteredProjects.map((project) => (
            <List.Item
              key={project.id}
              title={project.name}
              icon={{ source: Icon.Circle, tintColor: project.color }}
              accessories={
                project.archived ? [{ text: "Archived", icon: Icon.Box }] : []
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit Project"
                    icon={Icon.Pencil}
                    target={
                      <EditProjectForm
                        project={project}
                        onSave={loadProjects}
                      />
                    }
                  />
                  <Action
                    title={project.archived ? "Unarchive" : "Archive"}
                    icon={Icon.Box}
                    shortcut={{ modifiers: ["cmd"], key: "a" }}
                    onAction={() => handleToggleArchive(project)}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Create New Project"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={<CreateProjectForm onSave={loadProjects} />}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Project"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(project.id, project.name)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}

// Create project form
function CreateProjectForm({ onSave }: { onSave: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; color: string }) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid name",
        message: "Project name cannot be empty",
      });
      return;
    }

    try {
      await createProject({
        name: values.name.trim(),
        color: values.color || "#3B82F6",
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Project created",
        message: values.name,
      });

      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create project",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Project"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Project Name"
        placeholder="My Project"
        autoFocus
      />
      <Form.Dropdown id="color" title="Color" defaultValue="#3B82F6">
        <Form.Dropdown.Item
          value="#EF4444"
          title="Red"
          icon={{ source: Icon.Circle, tintColor: "#EF4444" }}
        />
        <Form.Dropdown.Item
          value="#F97316"
          title="Orange"
          icon={{ source: Icon.Circle, tintColor: "#F97316" }}
        />
        <Form.Dropdown.Item
          value="#EAB308"
          title="Yellow"
          icon={{ source: Icon.Circle, tintColor: "#EAB308" }}
        />
        <Form.Dropdown.Item
          value="#22C55E"
          title="Green"
          icon={{ source: Icon.Circle, tintColor: "#22C55E" }}
        />
        <Form.Dropdown.Item
          value="#3B82F6"
          title="Blue"
          icon={{ source: Icon.Circle, tintColor: "#3B82F6" }}
        />
        <Form.Dropdown.Item
          value="#8B5CF6"
          title="Purple"
          icon={{ source: Icon.Circle, tintColor: "#8B5CF6" }}
        />
        <Form.Dropdown.Item
          value="#EC4899"
          title="Pink"
          icon={{ source: Icon.Circle, tintColor: "#EC4899" }}
        />
      </Form.Dropdown>
    </Form>
  );
}

// Edit project form
function EditProjectForm({
  project,
  onSave,
}: {
  project: Project;
  onSave: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; color: string }) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid name",
        message: "Project name cannot be empty",
      });
      return;
    }

    try {
      await updateProject(project.id, {
        name: values.name.trim(),
        color: values.color,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Project updated",
        message: values.name,
      });

      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update project",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Project Name"
        defaultValue={project.name}
        autoFocus
      />
      <Form.Dropdown id="color" title="Color" defaultValue={project.color}>
        <Form.Dropdown.Item
          value="#EF4444"
          title="Red"
          icon={{ source: Icon.Circle, tintColor: "#EF4444" }}
        />
        <Form.Dropdown.Item
          value="#F97316"
          title="Orange"
          icon={{ source: Icon.Circle, tintColor: "#F97316" }}
        />
        <Form.Dropdown.Item
          value="#EAB308"
          title="Yellow"
          icon={{ source: Icon.Circle, tintColor: "#EAB308" }}
        />
        <Form.Dropdown.Item
          value="#22C55E"
          title="Green"
          icon={{ source: Icon.Circle, tintColor: "#22C55E" }}
        />
        <Form.Dropdown.Item
          value="#3B82F6"
          title="Blue"
          icon={{ source: Icon.Circle, tintColor: "#3B82F6" }}
        />
        <Form.Dropdown.Item
          value="#8B5CF6"
          title="Purple"
          icon={{ source: Icon.Circle, tintColor: "#8B5CF6" }}
        />
        <Form.Dropdown.Item
          value="#EC4899"
          title="Pink"
          icon={{ source: Icon.Circle, tintColor: "#EC4899" }}
        />
      </Form.Dropdown>
    </Form>
  );
}
