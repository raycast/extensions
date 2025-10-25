import { Form, ActionPanel, Action, showToast, Toast, popToRoot, openExtensionPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { createTask, getAllProjects } from "./notionClient";
import {
  TaskStatus,
  TaskPriority,
  TaskTag,
  TaskEstimatedTime,
  TaskEnergyLevel,
  TaskUrgency,
  TaskImportance,
  CreateTaskFormValues,
} from "./types";

const STATUS_OPTIONS: TaskStatus[] = ["Backlog", "To-do", "Blocked", "In progress", "Done"];
const PRIORITY_OPTIONS: TaskPriority[] = ["Critical", "High", "Medium", "Low"];
const TAG_OPTIONS: TaskTag[] = [
  "Design",
  "Development",
  "Research",
  "Planning",
  "Review",
  "Meeting",
  "Writing",
  "Bug",
  "Feature",
  "Documentation",
  "Testing",
  "Deployment",
  "Other",
];
const ESTIMATED_TIME_OPTIONS: TaskEstimatedTime[] = [
  "15 min",
  "30 min",
  "1 hour",
  "2 hours",
  "4 hours",
  "1 day",
  "2-3 days",
  "1 week+",
];
const ENERGY_LEVEL_OPTIONS: TaskEnergyLevel[] = ["High Energy", "Medium Energy", "Low Energy"];
const URGENCY_OPTIONS: TaskUrgency[] = ["Urgent", "Not Urgent"];
const IMPORTANCE_OPTIONS: TaskImportance[] = ["Important", "Not Important"];

export default function CreateTask() {
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [existingProjects, setExistingProjects] = useState<string[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [customProjectInput, setCustomProjectInput] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const projects = await getAllProjects();
      setExistingProjects(projects);
    } catch (error) {
      console.error("Error loading projects:", error);
      // Continue with empty list if loading fails
      setExistingProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }

  async function handleSubmit(values: CreateTaskFormValues) {
    if (!values.name || values.name.trim() === "") {
      setNameError("Task name is required");
      return;
    }

    // Use custom project input if user is typing a new project
    const finalValues = {
      ...values,
      project: values.project === "custom_new_project" ? customProjectInput : values.project,
    };

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task...",
    });

    try {
      const task = await createTask(finalValues);
      toast.style = Toast.Style.Success;
      toast.title = `✓ Task created: ${task.Name}`;
      toast.primaryAction = {
        title: "Open in Notion",
        onAction: async () => {
          await toast.hide();
          await Action.OpenInBrowser({ url: task.url });
        },
      };
      toast.secondaryAction = {
        title: "Create Another",
        onAction: async () => {
          await toast.hide();
          // Form will reset automatically
        },
      };
      await popToRoot();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create task";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";

      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        toast.primaryAction = {
          title: "Open Settings",
          onAction: async () => {
            await openExtensionPreferences();
          },
        };
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Task Name"
        placeholder="What needs to be done?"
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
        autoFocus
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Add task details, notes, or context..."
        enableMarkdown
      />

      <Form.Dropdown
        id="project"
        title="Project"
        defaultValue=""
        isLoading={projectsLoading}
        onChange={setSelectedProject}
        info="Select an existing project or choose 'Add New Project' to create a custom one"
      >
        <Form.Dropdown.Item value="" title="None" />
        {existingProjects.length > 0 && (
          <Form.Dropdown.Section title="Existing Projects">
            {existingProjects.map((project) => (
              <Form.Dropdown.Item key={project} value={project} title={project} />
            ))}
          </Form.Dropdown.Section>
        )}
        <Form.Dropdown.Section title="Other">
          <Form.Dropdown.Item value="custom_new_project" title="➕ Add New Project" />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      {selectedProject === "custom_new_project" && (
        <Form.TextField
          id="customProject"
          title="New Project Name"
          placeholder="Type new project name..."
          value={customProjectInput}
          onChange={setCustomProjectInput}
          autoFocus
        />
      )}

      <Form.Dropdown id="status" title="Status" defaultValue="To-do">
        {STATUS_OPTIONS.map((status) => (
          <Form.Dropdown.Item key={status} value={status} title={status} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="priority" title="Priority" defaultValue="">
        <Form.Dropdown.Item value="" title="None" />
        {PRIORITY_OPTIONS.map((priority) => (
          <Form.Dropdown.Item key={priority} value={priority} title={priority} />
        ))}
      </Form.Dropdown>

      <Form.DatePicker id="dueDate" title="Due Date" type={Form.DatePicker.Type.Date} />

      <Form.DatePicker id="planned" title="Planned Date" type={Form.DatePicker.Type.Date} />

      <Form.TagPicker id="tags" title="Tags">
        {TAG_OPTIONS.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>

      <Form.Dropdown id="estimatedTime" title="Estimated Time" defaultValue="">
        <Form.Dropdown.Item value="" title="None" />
        {ESTIMATED_TIME_OPTIONS.map((time) => (
          <Form.Dropdown.Item key={time} value={time} title={time} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="energyLevel" title="Energy Level" defaultValue="">
        <Form.Dropdown.Item value="" title="None" />
        {ENERGY_LEVEL_OPTIONS.map((level) => (
          <Form.Dropdown.Item key={level} value={level} title={level} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="urgency" title="Urgency" defaultValue="">
        <Form.Dropdown.Item value="" title="None" />
        {URGENCY_OPTIONS.map((urgency) => (
          <Form.Dropdown.Item key={urgency} value={urgency} title={urgency} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="importance" title="Importance" defaultValue="">
        <Form.Dropdown.Item value="" title="None" />
        {IMPORTANCE_OPTIONS.map((importance) => (
          <Form.Dropdown.Item key={importance} value={importance} title={importance} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="link" title="Link" placeholder="https://..." />
    </Form>
  );
}
