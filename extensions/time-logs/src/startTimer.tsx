import { useState, useEffect } from "react";
import {
  showToast,
  Toast,
  popToRoot,
  launchCommand,
  LaunchType,
  Action,
  ActionPanel,
  Form,
  Icon,
  Color,
  useNavigation,
} from "@raycast/api";
import { TimeEntry, Project } from "./models";
import { saveTimeEntry, stopActiveTimer, getProjects } from "./storage";
import { generateId } from "./utils";
import { ProjectForm } from "./components/ProjectForm";
import { showFailureToast } from "@raycast/utils";

export default function TrackTime() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [description, setDescription] = useState<string>("");
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
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handle project creation and selection
  const handleProjectCreated = async () => {
    try {
      setIsLoading(true);
      const allProjects = await getProjects();
      setProjects(allProjects);

      if (allProjects.length > 0) {
        const latestProject = allProjects[allProjects.length - 1];
        setSelectedProjectId(latestProject.id);
      }
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  };

  // Handle project selection change
  const handleProjectChange = (value: string) => {
    if (value === "create_new") {
      push(<ProjectForm onSave={handleProjectCreated} />);
    } else {
      setSelectedProjectId(value);
    }
  };

  async function handleSubmit() {
    try {
      // Determine project ID - "none" means unassigned (undefined)
      const projectId = selectedProjectId === "none" ? undefined : selectedProjectId;
      const selectedProject = projectId ? projects.find((p) => p.id === projectId) : undefined;

      // Stop any active timer first
      await stopActiveTimer();

      // Create new timer
      const newEntry: TimeEntry = {
        id: generateId(),
        description: description.trim() || null,
        startTime: new Date(),
        endTime: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        projectId: projectId,
      };

      await saveTimeEntry(newEntry);

      // Refresh the menu bar timer (if enabled)
      try {
        await launchCommand({ name: "menuBarTimer", type: LaunchType.UserInitiated });
      } catch {
        // Silently ignore if menu bar timer is disabled
        console.error("Menu bar timer command is disabled or not available");
      }

      // Show success toast
      const descriptionText = description.trim() || "Timer";
      const projectName = selectedProject ? selectedProject.name : "Unassigned";
      await showToast({
        style: Toast.Style.Success,
        title: `${projectName} — ${descriptionText} timer started`,
      });

      // Close Raycast
      popToRoot();
    } catch (error) {
      console.error("Error starting timer:", error);
      showFailureToast(error, { title: "Failed to start timer" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Start Timer" icon={Icon.Play} onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="project"
        title="Project"
        value={selectedProjectId}
        onChange={handleProjectChange}
        autoFocus={true}
      >
        <Form.Dropdown.Item
          value="none"
          title="Unassigned"
          icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
        />
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.name}
            icon={{ source: Icon.Circle, tintColor: project.color }}
          />
        ))}
        <Form.Dropdown.Section title="Actions">
          <Form.Dropdown.Item value="create_new" title="Create New Project..." icon={Icon.Plus} />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.TextArea
        id="description"
        title="Task Description"
        placeholder="Enter task description (optional)"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
