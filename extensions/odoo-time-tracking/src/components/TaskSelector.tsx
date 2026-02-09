/**
 * Reusable component for selecting projects and tasks with search and inline creation
 */

import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Project, Task, getProjects, getTasks, createTask } from "../utils/odoo";

interface TaskSelectorProps {
  onSubmit: (projectId: number, taskId: number, description: string) => void;
  initialProjectId?: number | null;
  initialTaskId?: number | null;
  initialDescription?: string | null;
}

export function TaskSelector({ onSubmit, initialProjectId, initialTaskId, initialDescription }: TaskSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId?.toString() || "");
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTaskId?.toString() || "");
  const [description, setDescription] = useState<string>(initialDescription || "");
  const [, setProjectSearch] = useState<string>("");
  const [taskSearch, setTaskSearch] = useState<string>("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load tasks when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadTasks(parseInt(selectedProjectId));
    } else {
      setTasks([]);
    }
  }, [selectedProjectId]);

  async function loadProjects(search = "") {
    setIsLoadingProjects(true);
    try {
      const projectList = await getProjects(search);
      setProjects(projectList);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function loadTasks(projectId: number, search = "") {
    setIsLoadingTasks(true);
    try {
      const taskList = await getTasks(projectId, search);
      setTasks(taskList);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoadingTasks(false);
    }
  }

  async function handleCreateTask() {
    if (!selectedProjectId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Project Selected",
        message: "Please select a project first",
      });
      return;
    }

    if (!taskSearch.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task Name Required",
        message: "Please enter a task name",
      });
      return;
    }

    setIsCreatingTask(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating task...",
      });

      const newTask = await createTask(parseInt(selectedProjectId), taskSearch.trim());

      await showToast({
        style: Toast.Style.Success,
        title: "Task Created",
        message: newTask.name,
      });

      // Reload tasks and select the new one
      await loadTasks(parseInt(selectedProjectId));
      setSelectedTaskId(newTask.id.toString());
      setTaskSearch("");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function handleTaskChange(value: string) {
    if (value === "__create__") {
      // Trigger task creation with the current search text
      await handleCreateTask();
      return;
    }
    setSelectedTaskId(value);
  }

  function handleSubmit() {
    if (!selectedProjectId) {
      showToast({
        style: Toast.Style.Failure,
        title: "Project Required",
        message: "Please select a project",
      });
      return;
    }

    if (!selectedTaskId) {
      showToast({
        style: Toast.Style.Failure,
        title: "Task Required",
        message: "Please select or create a task",
      });
      return;
    }

    onSubmit(parseInt(selectedProjectId), parseInt(selectedTaskId), description);
  }

  return (
    <Form
      isLoading={isLoadingProjects || isLoadingTasks || isCreatingTask}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Tracking" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      searchBarAccessory={<Form.Description text="Select project and task, or type a name to create a new task" />}
    >
      <Form.Dropdown
        id="project"
        title="Project"
        value={selectedProjectId}
        onChange={setSelectedProjectId}
        onSearchTextChange={(text) => {
          setProjectSearch(text);
          loadProjects(text);
        }}
        throttle
      >
        <Form.Dropdown.Item value="" title="Select a project..." />
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id.toString()} title={project.name} />
        ))}
      </Form.Dropdown>

      {selectedProjectId && (
        <Form.Dropdown
          id="task"
          title="Task"
          value={selectedTaskId}
          onChange={handleTaskChange}
          onSearchTextChange={(text) => {
            setTaskSearch(text);
            if (selectedProjectId) {
              loadTasks(parseInt(selectedProjectId), text);
            }
          }}
          throttle
        >
          <Form.Dropdown.Item value="" title="Select a task..." />
          {tasks.map((task) => (
            <Form.Dropdown.Item key={task.id} value={task.id.toString()} title={task.name} />
          ))}
          {taskSearch.trim() && <Form.Dropdown.Item value="__create__" title={`Create "${taskSearch.trim()}"`} />}
        </Form.Dropdown>
      )}

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description of work..."
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
