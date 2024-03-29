import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

import { getLinearClient } from "../api/linearClient";
import { getErrorMessage } from "../helpers/errors";
import useProjects from "../hooks/useProjects";
import { getProjectIcon } from "../helpers/projects";

export type CreateMilestoneValues = {
  projectId: string;
  name: string;
  description: string;
  targetDate: Date | null;
};

export default function CreateMilestoneForm({ projectId }: { projectId?: string }) {
  const { linearClient } = getLinearClient();
  const { pop } = useNavigation();

  const { projects, isLoadingProjects } = useProjects();

  const { handleSubmit, itemProps, focus, reset } = useForm<CreateMilestoneValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating Milestone" });

      try {
        const { success } = await linearClient.createProjectMilestone({
          projectId: values.projectId,
          name: values.name,
          description: values.description,
          ...(values.targetDate ? { targetDate: values.targetDate } : {}),
        });

        if (success) {
          toast.style = Toast.Style.Success;
          toast.title = `Created Milestone`;

          reset({
            projectId: "",
            name: "",
            description: "",
            targetDate: null,
          });
          focus("projectId");

          pop();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create milestone";
        toast.message = getErrorMessage(error);
      }
    },
    validation: {
      projectId: FormValidation.Required,
      name: FormValidation.Required,
    },
    initialValues: {
      projectId: projectId,
      name: "",
      description: "",
      targetDate: null,
    },
  });

  return (
    <Form
      isLoading={isLoadingProjects}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Milestone" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Project" storeValue {...itemProps.projectId}>
        {projects?.map((project) => (
          <Form.Dropdown.Item value={project.id} key={project.id} title={project.name} icon={getProjectIcon(project)} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField title="Name" placeholder="Milestone name" {...itemProps.name} />

      <Form.TextArea
        title="Description"
        placeholder="Add some details (supports Markdown, e.g. **bold**)"
        {...itemProps.description}
      />

      <Form.Separator />

      <Form.DatePicker title="Target Date" type={Form.DatePicker.Type.Date} {...itemProps.targetDate} />
    </Form>
  );
}
