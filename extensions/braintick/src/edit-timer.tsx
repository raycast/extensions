import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { makeAuthenticatedRequest } from "./lib/auth";
import { Project, Task, Timer } from "./types";

interface EditTimerProps {
  timer: Timer;
  onTimerUpdated: () => void;
}

export default function EditTimer({ timer, onTimerUpdated }: EditTimerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectId, setProjectId] = useState<string>(timer.project_id || "");
  const [taskId, setTaskId] = useState<string>(timer.task_id || "");
  const [description, setDescription] = useState<string>(timer.description || "");
  const [isBillable, setIsBillable] = useState<boolean>(timer.is_billable);
  const [startTime, setStartTime] = useState<string>(
    timer.start_time ? new Date(timer.start_time).toISOString().slice(0, 16) : "",
  );
  const [endTime, setEndTime] = useState<string>(
    timer.end_time ? new Date(timer.end_time).toISOString().slice(0, 16) : "",
  );

  const loadProjectsAndTasks = useCallback(async () => {
    try {
      const [projectsResponse, tasksResponse] = await Promise.all([
        makeAuthenticatedRequest("/projects"),
        makeAuthenticatedRequest("/tasks"),
      ]);

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData as Project[]);
      }

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData as Task[]);
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load projects and tasks",
      });
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjectsAndTasks();
  }, [loadProjectsAndTasks]);

  async function handleSubmit() {
    if (!projectId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please select a project",
      });
      return;
    }

    if (!startTime) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please set a start time",
      });
      return;
    }

    setIsLoading(true);

    try {
      const updateData: {
        project_id: string;
        task_id: string | null;
        description: string | null;
        is_billable: boolean;
        start_time: string;
        end_time?: string;
      } = {
        project_id: projectId,
        task_id: taskId || null,
        description: description.trim() || null,
        is_billable: isBillable,
        start_time: new Date(startTime).toISOString(),
      };

      if (endTime) {
        updateData.end_time = new Date(endTime).toISOString();
      }

      const response = await makeAuthenticatedRequest(`/timers/${timer.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Timer updated successfully",
        });

        if (onTimerUpdated) {
          onTimerUpdated();
        }

        await popToRoot();
      } else {
        throw new Error("Failed to update timer");
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to update timer",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading state while data is being fetched
  if (isDataLoading) {
    return (
      <Form
        isLoading={true}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Update Timer" icon={Icon.Pencil} onSubmit={handleSubmit} />
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
          <Action.SubmitForm title="Update Timer" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="project" title="Project" value={projectId} onChange={setProjectId} storeValue>
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="task" title="Task (Optional)" value={taskId} onChange={setTaskId} storeValue>
        <Form.Dropdown.Item value="" title="No Task" />
        {tasks
          .filter((task) => task.project_id === projectId)
          .map((task) => (
            <Form.Dropdown.Item key={task.id} value={task.id} title={task.title} />
          ))}
      </Form.Dropdown>

      <Form.TextArea
        id="description"
        title="Description"
        value={description}
        onChange={setDescription}
        placeholder="Enter timer description..."
      />

      <Form.DatePicker
        id="startTime"
        title="Start Time"
        value={new Date(startTime)}
        onChange={(date) => setStartTime(date ? date.toISOString().slice(0, 16) : "")}
      />

      <Form.DatePicker
        id="endTime"
        title="End Time (Optional)"
        value={endTime ? new Date(endTime) : undefined}
        onChange={(date) => setEndTime(date ? date.toISOString().slice(0, 16) : "")}
      />

      <Form.Checkbox id="isBillable" label="Billable" value={isBillable} onChange={setIsBillable} />
    </Form>
  );
}
