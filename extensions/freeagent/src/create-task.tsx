import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeAgent } from "./oauth";
import { Project, TaskFormValues } from "./types";
import { fetchProjects, createTask } from "./services/freeagent";
import { useFreeAgent } from "./hooks/useFreeAgent";
import { showFailureToast } from "@raycast/utils";

const CreateTask = function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const { isLoading, isAuthenticated, accessToken, handleError } = useFreeAgent();

  useEffect(() => {
    async function loadData() {
      if (!isAuthenticated || !accessToken) return;

      try {
        const projectList = await fetchProjects(accessToken, "active");
        setProjects(projectList);
      } catch (error) {
        handleError(error, "Failed to fetch projects");
      }
    }

    loadData();
  }, [isAuthenticated, accessToken]);

  async function handleSubmit(values: TaskFormValues) {
    if (!accessToken) {
      handleError(new Error("No access token available"), "Failed to create task");
      return;
    }

    if (!values.project) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a project",
      });
      return;
    }

    if (!values.name || values.name.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a task name",
      });
      return;
    }

    try {
      // Find the selected project to get its currency
      const project = projects.find((p) => p.url === values.project);
      if (!project) {
        handleError(new Error("Selected project not found"), "Failed to create task");
        return;
      }

      const taskData = {
        name: values.name.trim(),
        currency: project.currency,
        is_billable: values.is_billable,
        billing_rate: values.billing_rate && values.billing_rate.trim() !== "" ? values.billing_rate : undefined,
        billing_period: values.billing_period || undefined,
        status: values.status || "Active",
      };

      await createTask(accessToken, values.project, taskData);

      showToast({
        style: Toast.Style.Success,
        title: "Task created successfully",
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to create task" });
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Task" />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new task in FreeAgent" />

      <Form.Dropdown id="project" title="Project" placeholder="Select a project">
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.url}
            value={project.url}
            title={`${project.name} - ${project.contact_name}`}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="name"
        title="Task Name"
        placeholder="Enter task name (e.g., Development, Design, Consulting)"
        info="Name of the task. Required field."
      />

      <Form.Checkbox id="is_billable" label="Is Billable" defaultValue={true} />

      <Form.TextField
        id="billing_rate"
        title="Billing Rate"
        placeholder="Enter billing rate (e.g., 75.00)"
        info="Optional. The rate at which the task is billed."
      />

      <Form.Dropdown
        id="billing_period"
        title="Billing Period"
        defaultValue="hour"
        info="Optional. The period for which the billing rate applies."
      >
        <Form.Dropdown.Item value="hour" title="Hour" />
        <Form.Dropdown.Item value="day" title="Day" />
      </Form.Dropdown>

      <Form.Dropdown id="status" title="Status" defaultValue="Active" info="Optional. The status of the task.">
        <Form.Dropdown.Item value="Active" title="Active" />
        <Form.Dropdown.Item value="Completed" title="Completed" />
        <Form.Dropdown.Item value="Hidden" title="Hidden" />
      </Form.Dropdown>
    </Form>
  );
};

export default authorizedWithFreeAgent(CreateTask);
