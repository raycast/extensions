import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Project } from "./models";
import { getProjects, saveProject, deleteProject } from "./storage";
import { generateId } from "./utils";

export default function ViewProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    try {
      const loadedProjects = await getProjects();
      setProjects(loadedProjects);
    } catch (error) {
      showFailureToast(error, { title: "Failed to load projects" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      actions={
        <ActionPanel>
          <Action
            title="Add New Project"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<ProjectForm onSave={loadProjects} />)}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={{ source: Icon.Folder }}
        title="No Projects"
        description="Add your first project to get started!"
      />
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={{ source: Icon.Dot, tintColor: project.color }}
          title={project.name}
          actions={
            <ActionPanel>
              <Action
                title="Edit Project"
                icon={Icon.Pencil}
                onAction={() => push(<ProjectForm project={project} onSave={loadProjects} />)}
              />
              <Action
                title="Add New Project"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => push(<ProjectForm onSave={loadProjects} />)}
              />
              <ActionPanel.Section />
              <Action
                title="Delete Project"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Delete Project",
                      message: "Are you sure you want to delete this project? This action cannot be undone.",
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    })
                  ) {
                    await deleteProject(project.id);
                    await loadProjects();
                    showToast({
                      style: Toast.Style.Success,
                      title: "Project deleted",
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ProjectForm({ project, onSave }: { project?: Project; onSave: () => Promise<void> }) {
  const [nameError, setNameError] = useState<string | undefined>();
  const [projectName, setProjectName] = useState<string>(project?.name || "");
  const [selectedColor, setSelectedColor] = useState<string>(project?.color || Color.Blue);
  const { pop } = useNavigation();

  const predefinedColors = [
    { label: "Red", value: Color.Red },
    { label: "Orange", value: Color.Orange },
    { label: "Yellow", value: Color.Yellow },
    { label: "Green", value: Color.Green },
    { label: "Blue", value: Color.Blue },
    { label: "Purple", value: Color.Purple },
    { label: "Magenta", value: Color.Magenta },
  ];

  async function handleSubmit() {
    // Validation
    if (!projectName || projectName.trim() === "") {
      setNameError("Project name is required");
      return;
    }

    try {
      // Create a new project
      const newProject: Project = {
        id: project?.id || generateId(),
        name: projectName.trim(),
        color: selectedColor,
        createdAt: project?.createdAt || new Date().toISOString(),
      };

      // Save the project
      await saveProject(newProject);

      // Notify success
      showToast({
        style: Toast.Style.Success,
        title: project ? "Project Updated" : "Project Created",
      });

      // Call onSave callback to update parent component
      await onSave();

      // Return to previous screen
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to save project" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Save Project" icon={Icon.Check} onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter project name"
        value={projectName}
        onChange={(value) => {
          setProjectName(value);
          if (value && value.trim() !== "") {
            setNameError(undefined);
          }
        }}
        error={nameError}
        autoFocus={true}
      />

      <Form.Dropdown id="color" title="Color" value={selectedColor} onChange={setSelectedColor} storeValue={true}>
        {predefinedColors.map((color) => (
          <Form.Dropdown.Item
            key={color.value}
            value={color.value}
            title={color.label}
            icon={{ source: Icon.Dot, tintColor: color.value }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
