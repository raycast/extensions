import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  useNavigation,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { getProjects, createEntry, getLastUsedProject } from "./utils/storage";
import { parseDuration, formatDuration } from "./utils/duration";
import { Project } from "./utils/types";

interface FormValues {
  projectId: string;
  duration: string;
  comment: string;
  date: Date;
}

export default function LogTime() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultProjectId, setDefaultProjectId] = useState<string>("");
  const { pop } = useNavigation();

  useEffect(() => {
    async function loadData() {
      try {
        const projectsList = await getProjects();
        setProjects(projectsList);

        // Set default to last used project
        const lastProject = await getLastUsedProject();
        if (lastProject) {
          setDefaultProjectId(lastProject.id);
        } else if (projectsList.length > 0) {
          setDefaultProjectId(projectsList[0].id);
        }
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

    loadData();
  }, []);

  async function handleSubmit(values: FormValues) {
    // Validate duration
    const duration = parseDuration(values.duration);
    if (!duration || duration <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid duration",
        message: "Please enter a valid duration (e.g., 2.5, 2h30, 2:30)",
      });
      return;
    }

    // Validate project selection
    if (!values.projectId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No project selected",
        message: "Please select a project",
      });
      return;
    }

    try {
      await createEntry({
        projectId: values.projectId,
        date: format(values.date, "yyyy-MM-dd"),
        duration: duration,
        comment: values.comment.trim(),
      });

      const project = projects.find((p) => p.id === values.projectId);
      await showToast({
        style: Toast.Style.Success,
        title: "Time logged",
        message: `${formatDuration(duration)} on ${project?.name || "project"}`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to log time",
        message: String(error),
      });
    }
  }

  if (projects.length === 0 && !isLoading) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Project First"
              icon={Icon.Plus}
              target={<CreateProjectForm onProjectCreated={() => {}} />}
            />
          </ActionPanel>
        }
      >
        <Form.Description text="No projects found. Please create a project first." />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Time Entry"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="projectId"
        title="Project"
        defaultValue={defaultProjectId}
        storeValue
      >
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.name}
            icon={{ source: Icon.Circle, tintColor: project.color }}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="duration"
        title="Duration"
        placeholder="2.5, 2h30, 2:30"
        info="Formats: 2.5, 2h30, 2:30, 30m"
        autoFocus
      />

      <Form.DatePicker id="date" title="Date" defaultValue={new Date()} />

      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="What did you work on?"
      />
    </Form>
  );
}

// Quick inline form for creating a project when none exist
function CreateProjectForm({
  onProjectCreated,
}: {
  onProjectCreated: () => void;
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
      const { createProject } = await import("./utils/storage");
      await createProject({
        name: values.name.trim(),
        color: values.color || "#3B82F6",
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Project created",
        message: values.name,
      });

      onProjectCreated();
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
