import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getMotionApiClient, LABEL_PRESETS, Project } from "./api/motion";

type Values = {
  name: string;
  description: string;
  dueDate: Date;
  priority: "LOW" | "MEDIUM" | "HIGH" | "ASAP";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  label: string;
  projectId: string;
  duration: string;
  customDuration: string;
};

// Define the task payload type to match what we're creating
type TaskPayload = {
  title: string;
  description: string;
  dueDate: Date;
  priority: "LOW" | "MEDIUM" | "HIGH" | "ASAP";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  label?: string;
  projectId?: string;
  duration?: number | "NONE" | "REMINDER";
  autoScheduled?: {
    startDate?: string;
    deadlineType?: "HARD" | "SOFT" | "NONE";
    schedule?: string;
  };
};

// Helper function to get tomorrow's date
function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Set to midnight
  return tomorrow;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState("30");

  // Set default values
  const tomorrow = getTomorrow();

  // Update showCustomDuration when selectedDuration changes
  useEffect(() => {
    setShowCustomDuration(selectedDuration === "custom");
  }, [selectedDuration]);

  // Fetch projects when component mounts
  useEffect(() => {
    async function fetchProjects() {
      let motionClient;

      // First try to get the client
      try {
        motionClient = getMotionApiClient();
      } catch (error) {
        console.error("Error initializing Motion API client:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to initialize Motion client",
          message: String(error),
        });
        setIsLoadingProjects(false);
        return;
      }

      try {
        const projectsData = await motionClient.getProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error("Error fetching projects:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load projects",
          message: String(error),
        });
      } finally {
        setIsLoadingProjects(false);
      }
    }

    fetchProjects();
  }, []);

  // Handle duration dropdown changes
  function handleDurationChange(newValue: string) {
    setSelectedDuration(newValue);
  }

  async function handleSubmit(values: Values) {
    setIsLoading(true);

    let motionClient;

    // First try to get the client
    try {
      motionClient = getMotionApiClient();
    } catch (error) {
      console.error("Error initializing Motion API client:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to initialize Motion client",
        message: String(error),
      });
      setIsLoading(false);
      return;
    }

    try {
      // Create a task payload with required fields
      const taskPayload: TaskPayload = {
        title: values.name,
        description: values.description,
        dueDate: values.dueDate,
        priority: values.priority,
        status: values.status,
      };

      // Only add label if it has a value
      if (values.label) {
        taskPayload.label = values.label;
      }

      // Only add projectId if it has a value
      if (values.projectId) {
        taskPayload.projectId = values.projectId;
      }

      // Handle duration based on selection
      if (values.duration === "reminder") {
        taskPayload.duration = "REMINDER";
      } else if (values.duration === "none") {
        taskPayload.duration = "NONE";
      } else if (values.duration === "15") {
        taskPayload.duration = 15;
      } else if (values.duration === "30") {
        taskPayload.duration = 30;
      } else if (values.duration === "60") {
        taskPayload.duration = 60;
      } else if (values.duration === "custom" && values.customDuration) {
        const customDuration = parseInt(values.customDuration, 10);
        if (!isNaN(customDuration) && customDuration > 0) {
          taskPayload.duration = customDuration;
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid duration",
            message: "Duration must be a positive number",
          });
          setIsLoading(false);
          return;
        }
      }

      // Create the task with the prepared payload
      await motionClient.createTask(taskPayload);

      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: `"${values.name}" has been added to Motion`,
      });
    } catch (error) {
      console.error("Error creating task:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isLoadingProjects}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new task to your Motion account. All tasks are auto-scheduled by default using Motion's AI." />
      <Form.TextField id="name" title="Name" placeholder="Task name" />
      <Form.TextArea id="description" title="Description" placeholder="Task description" />

      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        defaultValue={tomorrow}
        type={Form.DatePicker.Type.Date} // Only date, no time
      />

      <Form.Dropdown id="priority" title="Priority" defaultValue="MEDIUM">
        <Form.Dropdown.Item value="LOW" title="Low" />
        <Form.Dropdown.Item value="MEDIUM" title="Medium" />
        <Form.Dropdown.Item value="HIGH" title="High" />
        <Form.Dropdown.Item value="ASAP" title="ASAP" />
      </Form.Dropdown>

      <Form.Dropdown id="status" title="Status" defaultValue="TODO">
        <Form.Dropdown.Item value="TODO" title="To Do" />
        <Form.Dropdown.Item value="IN_PROGRESS" title="In Progress" />
        <Form.Dropdown.Item value="DONE" title="Done" />
      </Form.Dropdown>

      <Form.Dropdown
        id="duration"
        title="Duration"
        defaultValue="30"
        onChange={handleDurationChange}
      >
        <Form.Dropdown.Item value="reminder" title="Reminder (No time block)" />
        <Form.Dropdown.Item value="15" title="15 mins" />
        <Form.Dropdown.Item value="30" title="30 mins" />
        <Form.Dropdown.Item value="60" title="60 mins" />
        <Form.Dropdown.Item value="custom" title="Other..." />
      </Form.Dropdown>

      {showCustomDuration && (
        <Form.TextField
          id="customDuration"
          title="Custom Duration (minutes)"
          placeholder="Enter duration in minutes"
          info="Enter a positive number of minutes"
        />
      )}

      <Form.Dropdown id="label" title="Label">
        <Form.Dropdown.Item value="" title="None" />
        {LABEL_PRESETS.map((label) => (
          <Form.Dropdown.Item key={label} value={label} title={label} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="projectId" title="Project">
        <Form.Dropdown.Item value="" title="None" />
        {projects.map((project: Project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
