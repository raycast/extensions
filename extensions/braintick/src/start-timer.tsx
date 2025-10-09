import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { makeAuthenticatedRequest } from "./lib/auth";
import { CreateTimerInput, Project, Task } from "./types";

interface StartTimerProps {
  onTimerStarted?: () => void;
  defaultProjectId?: string;
  defaultTaskId?: string;
}

export default function StartTimer({ onTimerStarted, defaultProjectId, defaultTaskId }: StartTimerProps) {
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [taskId, setTaskId] = useState(defaultTaskId || "");
  const [isBillable, setIsBillable] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    loadProjectsAndTasks();
  }, []);

  async function loadProjectsAndTasks() {
    try {
      setIsDataLoading(true);
      const [projectsResponse, tasksResponse] = await Promise.all([
        makeAuthenticatedRequest("/projects"),
        makeAuthenticatedRequest("/tasks"),
      ]);

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects((projectsData as Project[]) || []);
      }

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks((tasksData as Task[]) || []);
      }
    } catch {
      console.error("Failed to load data");
    } finally {
      setIsDataLoading(false);
    }
  }

  async function handleSubmit() {
    if (!projectId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please select a project",
      });
      return;
    }

    setIsLoading(true);

    try {
      const timerData: CreateTimerInput = {
        project_id: projectId,
        task_id: taskId || undefined,
        description: description.trim() || undefined,
        is_billable: isBillable,
        is_active: true,
        start_time: new Date().toISOString(),
      };

      const response = await makeAuthenticatedRequest("/timers", {
        method: "POST",
        body: JSON.stringify(timerData),
      });

      if (response.ok) {
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Timer started",
        });

        if (onTimerStarted) {
          onTimerStarted();
        }

        await popToRoot();
      } else {
        throw new Error("Failed to start timer");
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to start timer",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    console.log(taskId, projectId, "Rendered");
  }, [taskId, projectId]);

  // Show loading state while data is being fetched
  if (isDataLoading) {
    return (
      <Form
        isLoading={true}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Start Timer" icon={Icon.Play} onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.Description text="Loading projects and tasks..." />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectId" title="Project" value={projectId} onChange={setProjectId}>
        <Form.Dropdown.Item value="" title="Select a project" />
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="taskId" title="Task (Optional)" value={taskId} onChange={setTaskId}>
        <Form.Dropdown.Item value="" title="No specific task" />
        {tasks
          .filter((task) => (projectId ? task.project_id === projectId : true))
          .map((task) => (
            <Form.Dropdown.Item key={task.id} value={task.id} title={task.title} />
          ))}
      </Form.Dropdown>

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="What are you working on? (optional)"
        value={description}
        onChange={setDescription}
      />

      <Form.Checkbox id="isBillable" label="Mark as billable" value={isBillable} onChange={setIsBillable} />
    </Form>
  );
}
