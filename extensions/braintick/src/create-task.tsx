import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { makeAuthenticatedRequest } from "./lib/auth";
import { CreateTaskInput, Project } from "./types";

interface CreateTaskProps {
  onTaskCreated?: () => void;
  defaultProjectId?: string;
}

const priorityOptions = [
  { title: "Low", value: "low" },
  { title: "Medium", value: "medium" },
  { title: "High", value: "high" },
  { title: "Urgent", value: "urgent" },
];

export default function CreateTask({ onTaskCreated, defaultProjectId }: CreateTaskProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [syncWithHuly, setSyncWithHuly] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const response = await makeAuthenticatedRequest("/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects((data as Project[]) || []);
      }
    } catch {
      console.error("Failed to load projects");
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Task title is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      const taskData: CreateTaskInput = {
        title: title.trim(),
        priority,
        description: description.trim() || undefined,
        due_date: dueDate?.toISOString() || undefined,
        project_id: projectId || undefined,
        sync_with_huly: syncWithHuly,
        completed: false,
      };

      const response = await makeAuthenticatedRequest("/tasks", {
        method: "POST",
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Task created successfully",
        });

        if (onTaskCreated) {
          onTaskCreated();
        }

        await popToRoot();
      } else {
        throw new Error("Failed to create task");
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to create task",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Task Title" placeholder="Enter task title" value={title} onChange={setTitle} />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter task description (optional)"
        value={description}
        onChange={setDescription}
      />
      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority}>
        {priorityOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker id="dueDate" title="Due Date" value={dueDate} onChange={setDueDate} />
      {projects.length > 0 && (
        <Form.Dropdown id="projectId" title="Project" value={projectId} onChange={setProjectId}>
          <Form.Dropdown.Item value="" title="No Project" />
          {projects.map((project) => (
            <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Checkbox id="syncWithHuly" label="Sync with Huly" value={syncWithHuly} onChange={setSyncWithHuly} />
    </Form>
  );
}
