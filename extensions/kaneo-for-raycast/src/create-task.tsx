import { ActionPanel, Action, Form, getPreferenceValues, Icon, PopToRootType, showHUD } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { CreateTaskFormValues } from "./types";
import { KaneoAPI } from "./api/kaneo";

export default function Command() {
  const { workspaceId } = getPreferenceValues();
  const kaneoApi = new KaneoAPI();

  const { isLoading, data: projects = [] } = usePromise(
    (workspaceId: string) => kaneoApi.getProjects(workspaceId),
    [workspaceId],
  );

  const { handleSubmit, itemProps } = useForm<CreateTaskFormValues>({
    onSubmit: async (values) => {
      try {
        await kaneoApi.createTask(values.projectId, {
          title: values.title,
          description: values.description || "",
          ...(values.dueDate && { dueDate: values.dueDate.toISOString() }),
          priority: values.priority || "no-priority",
          status: "to-do",
        });

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
      <Form.Dropdown {...itemProps.projectId} title="Project">
        {projects.length === 0 ? (
          <Form.Dropdown.Item title="No projects available" value="" icon={Icon.List} />
        ) : (
          <>
            <Form.Dropdown.Item title="No project" value="" icon={Icon.List} />
            {projects.map((project) => (
              <Form.Dropdown.Item key={project.id} value={project.id.toString()} title={project.name} />
            ))}
          </>
        )}
      </Form.Dropdown>
    </Form>
  );
}
