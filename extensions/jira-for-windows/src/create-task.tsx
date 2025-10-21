import { Form, ActionPanel, Action, showToast, Toast, useNavigation, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { JiraAPI } from "./jira-api";

interface FormValues {
  title: string;
  description: string;
  project: string;
  issueType: string;
  dueDate?: Date;
  priority?: string;
  labels: string[];
}

interface Project {
  id: string;
  key: string;
  name: string;
}

interface Priority {
  id: string;
  name: string;
}

interface IssueType {
  id: string;
  name: string;
}

export default function Command() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const api = new JiraAPI();
        const [projectsData, prioritiesData] = await Promise.all([api.getProjects(), api.getPriorities()]);

        setProjects(projectsData);
        setPriorities(prioritiesData);

        if (projectsData.length > 0) {
          setSelectedProject(projectsData[0].key);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  useEffect(() => {
    async function fetchProjectData() {
      if (!selectedProject) return;

      try {
        const api = new JiraAPI();
        const [issueTypesData, labelsData] = await Promise.all([
          api.getIssueTypes(selectedProject),
          api.getExistingLabels(selectedProject),
        ]);

        setIssueTypes(issueTypesData);
        setLabels(labelsData);
      } catch (error) {
        console.error("Error fetching project data:", error);
      }
    }

    fetchProjectData();
  }, [selectedProject]);

  async function handleSubmit(values: FormValues) {
    if (!values.title || !values.project || !values.issueType) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing required fields",
        message: "Title, Project, and Issue Type are required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task...",
    });

    try {
      const api = new JiraAPI();
      const issue = await api.createIssue({
        projectKey: values.project,
        summary: values.title,
        description: values.description || "",
        issueType: values.issueType,
        dueDate: values.dueDate ? formatDateForJira(values.dueDate) : undefined,
        priorityId: values.priority,
        labels: values.labels,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Task created successfully";
      toast.message = `${issue.key} - ${values.title}`;
      toast.primaryAction = {
        title: "Open in Jira",
        onAction: () => {
          const prefs = getPreferenceValues<{ jiraDomain: string }>();
          open(`https://${prefs.jiraDomain}/browse/${issue.key}`);
        },
      };

      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create task";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  function formatDateForJira(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const deadlineOptions = [
    { title: "Today", value: "today" },
    { title: "Tomorrow", value: "tomorrow" },
    { title: "In 3 days", value: "3days" },
    { title: "In 1 week", value: "1week" },
    { title: "In 2 weeks", value: "2weeks" },
    { title: "In 1 month", value: "1month" },
    { title: "Custom", value: "custom" },
  ];

  const [deadlineType, setDeadlineType] = useState<string>("1week");

  function getDateFromDeadlineType(type: string): Date | undefined {
    const today = new Date();
    switch (type) {
      case "today":
        return today;
      case "tomorrow":
        return new Date(today.setDate(today.getDate() + 1));
      case "3days":
        return new Date(today.setDate(today.getDate() + 3));
      case "1week":
        return new Date(today.setDate(today.getDate() + 7));
      case "2weeks":
        return new Date(today.setDate(today.getDate() + 14));
      case "1month":
        return new Date(today.setMonth(today.getMonth() + 1));
      default:
        return undefined;
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            onSubmit={(values) => {
              const dueDate = deadlineType === "custom" ? values.customDate : getDateFromDeadlineType(deadlineType);
              handleSubmit({ ...values, dueDate });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new Jira task with all the details" />

      <Form.TextField id="title" title="Title" placeholder="Enter task title" info="A brief summary of the task" />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter detailed description"
        info="Detailed description of what needs to be done"
      />

      <Form.Separator />

      <Form.Dropdown
        id="project"
        title="Project"
        value={selectedProject}
        onChange={setSelectedProject}
        info="Select the Jira project for this task"
      >
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.key} title={`${project.name} (${project.key})`} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="issueType" title="Issue Type" info="Type of issue to create">
        {issueTypes.map((type) => (
          <Form.Dropdown.Item key={type.id} value={type.name} title={type.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown
        id="deadlineType"
        title="Deadline"
        value={deadlineType}
        onChange={setDeadlineType}
        info="When should this task be completed?"
      >
        {deadlineOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      {deadlineType === "custom" && (
        <Form.DatePicker id="customDate" title="Custom Date" info="Select a custom due date" />
      )}

      <Form.Dropdown id="priority" title="Priority" info="Task priority level">
        <Form.Dropdown.Item value="" title="None" />
        {priorities.map((priority) => (
          <Form.Dropdown.Item key={priority.id} value={priority.id} title={priority.name} />
        ))}
      </Form.Dropdown>

      <Form.TagPicker id="labels" title="Labels" info="Add labels to categorize this task">
        {labels.map((label) => (
          <Form.TagPicker.Item key={label} value={label} title={label} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
