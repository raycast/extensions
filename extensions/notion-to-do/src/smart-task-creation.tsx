import { Form, ActionPanel, Action, showToast, Toast, popToRoot, openExtensionPreferences, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { createTask, getAllProjects } from "./notionClient";
import { parseNaturalLanguageTask, isAIEnabled } from "./aiHelper";
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

export default function SmartTaskCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [existingProjects, setExistingProjects] = useState<string[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [customProjectInput, setCustomProjectInput] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");

  // AI suggested values
  const [suggestedName, setSuggestedName] = useState("");
  const [suggestedProject, setSuggestedProject] = useState<string>("");
  const [suggestedPriority, setSuggestedPriority] = useState<TaskPriority | "">("");
  const [suggestedEstimatedTime, setSuggestedEstimatedTime] = useState<TaskEstimatedTime | "">("");
  const [suggestedTags, setSuggestedTags] = useState<TaskTag[]>([]);
  const [suggestedDueDate, setSuggestedDueDate] = useState<Date | undefined>();
  const [suggestedDescription, setSuggestedDescription] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const projects = await getAllProjects();
      setExistingProjects(projects);
    } catch (error) {
      console.error("Error loading projects:", error);
      setExistingProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }

  async function handleParseNaturalLanguage() {
    if (!naturalLanguageInput.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a task description",
      });
      return;
    }

    if (!isAIEnabled()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "AI not available",
        message: "Please enable Raycast Pro or add OpenAI API key in settings",
        primaryAction: {
          title: "Open Settings",
          onAction: async () => {
            await openExtensionPreferences();
          },
        },
      });
      return;
    }

    setIsParsing(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "🤖 AI is parsing your task...",
    });

    try {
      const parsed = await parseNaturalLanguageTask(naturalLanguageInput);

      setSuggestedName(parsed.name);
      setSuggestedProject(parsed.project || "");
      setSuggestedPriority(parsed.priority || "");
      setSuggestedEstimatedTime(parsed.estimatedTime || "");
      setSuggestedTags(parsed.tags || []);
      setSuggestedDueDate(parsed.dueDate);
      setSuggestedDescription(parsed.description || "");

      if (parsed.project) {
        setSelectedProject(parsed.project);
      }

      toast.style = Toast.Style.Success;
      toast.title = "✨ Task parsed! Review and adjust suggestions";
    } catch (error) {
      console.error("Error parsing task:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to parse task";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSubmit(values: CreateTaskFormValues) {
    if (!values.name || values.name.trim() === "") {
      setNameError("Task name is required");
      return;
    }

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
      await popToRoot();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create task";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isParsing}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} icon={Icon.Check} />
          <Action
            title="Parse with AI"
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={handleParseNaturalLanguage}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="🤖 AI-Powered Task Creation"
        text="Describe your task naturally and let AI suggest details"
      />

      <Form.TextArea
        id="naturalLanguage"
        title="Natural Language"
        placeholder="Example: Review design system by Friday..."
        value={naturalLanguageInput}
        onChange={setNaturalLanguageInput}
        info="Press ⌘+P to parse with AI"
        autoFocus
      />

      <Form.Separator />

      <Form.TextField
        id="name"
        title="Task Name"
        placeholder="What needs to be done?"
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
        value={suggestedName}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Add task details, notes, or context..."
        enableMarkdown
        value={suggestedDescription}
      />

      <Form.Dropdown
        id="project"
        title="Project"
        value={suggestedProject || selectedProject}
        isLoading={projectsLoading}
        onChange={setSelectedProject}
        info="AI suggested or select manually"
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
        />
      )}

      <Form.Dropdown id="status" title="Status" defaultValue="To-do">
        {STATUS_OPTIONS.map((status) => (
          <Form.Dropdown.Item key={status} value={status} title={status} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="priority" title="Priority" value={suggestedPriority}>
        <Form.Dropdown.Item value="" title="None" />
        {PRIORITY_OPTIONS.map((priority) => (
          <Form.Dropdown.Item key={priority} value={priority} title={priority} />
        ))}
      </Form.Dropdown>

      <Form.DatePicker id="dueDate" title="Due Date" type={Form.DatePicker.Type.Date} value={suggestedDueDate} />

      <Form.DatePicker id="planned" title="Planned Date" type={Form.DatePicker.Type.Date} />

      <Form.TagPicker id="tags" title="Tags" value={suggestedTags}>
        {TAG_OPTIONS.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>

      <Form.Dropdown id="estimatedTime" title="Estimated Time" value={suggestedEstimatedTime}>
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
