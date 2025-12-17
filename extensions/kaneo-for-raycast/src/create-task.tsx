import { ActionPanel, Action, Form, getPreferenceValues, Icon, PopToRootType, showHUD } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { CreateTaskFormValues, Project } from "./types";

export default function Command() {
  const { instanceUrl, apiToken, workspaceId } = getPreferenceValues();

  const projectsUrl = `${instanceUrl}/api/project?workspaceId=${workspaceId}`;
  const { isLoading, data: projects = [] } = useFetch<Project[]>(projectsUrl, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
  });

  const { handleSubmit, itemProps } = useForm<CreateTaskFormValues>({
    onSubmit: async (values) => {
      try {
        const response = await fetch(`${instanceUrl}/api/task/${values.projectId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({
            projectId: values.projectId,
            title: values.title,
            description: values.description || "",
            dueDate: values.dueDate || "",
            priority: values.priority || "no-priority",
            status: "to-do",
          }),
        });

        if (!response.ok) {
          const { message } = await response.json();
          throw new Error(message || `HTTP error! status: ${response.status}`);
        }

        await showHUD("Task created successfully!", { popToRootType: PopToRootType.Immediate });
      } catch (error) {
        await showHUD(`Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`, {
          popToRootType: PopToRootType.Immediate,
        });
      }
    },
    validation: {
      title: FormValidation.Required,
      projectId: FormValidation.Required,
    },
  });

  const priorityOptions = [
    { value: "no-priority", title: "No Priority" },
    { value: "low", title: "Low" },
    { value: "medium", title: "Medium" },
    { value: "high", title: "High" },
    { value: "urgent", title: "Urgent" },
  ];

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="Enter task title" />
      <Form.TextArea {...itemProps.description} title="Description" placeholder="Enter task description" />
      <Form.Separator />
      <Form.DatePicker {...itemProps.dueDate} title="Due Date" type={Form.DatePicker.Type.DateTime} />
      <Form.Dropdown {...itemProps.priority} title="Priority">
        {priorityOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      {projects.length > 0 && (
        <Form.Dropdown {...itemProps.projectId} title="Project">
          <Form.Dropdown.Item title="No project" value="" icon={Icon.List} />
          {projects.map((project) => (
            <Form.Dropdown.Item key={project.id} value={project.id.toString()} title={project.name} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
