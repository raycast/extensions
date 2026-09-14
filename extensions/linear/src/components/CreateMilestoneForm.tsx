import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useRef } from "react";

import { getLinearClient } from "../api/linearClient";
import { getErrorMessage } from "../helpers/errors";
import { getProjectIcon } from "../helpers/projects";
import useProjects from "../hooks/useProjects";
import { useWorkspaceCachedState } from "../hooks/useWorkspaceCachedState";

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

  const { handleSubmit, itemProps, values, setValue, focus, reset } = useForm<CreateMilestoneValues>({
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

  const [storedProject, setStoredProject] = useWorkspaceCachedState<string>("create-milestone-project", "");
  const restoredRef = useRef(false);

  // Persist the Project selection per workspace (replaces the old Form.Dropdown
  // persistence prop, §4.5/B6). This dropdown has no "no project" option, so an empty
  // value is never an intentional choice — only non-empty values are worth remembering.
  useEffect(() => {
    if (!restoredRef.current) return;
    if (values.projectId) setStoredProject(values.projectId);
  }, [values.projectId]);

  // Restore once per mount, validated against THIS workspace's data; an explicit
  // projectId prop (e.g. opened from a project's context) wins over the stored default.
  useEffect(() => {
    if (restoredRef.current || isLoadingProjects || !projects) return;
    restoredRef.current = true;
    if (!projectId && storedProject && projects.some((project) => project.id === storedProject)) {
      setValue("projectId", storedProject);
    }
  }, [isLoadingProjects, projects]);

  return (
    <Form
      isLoading={isLoadingProjects}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Milestone" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Project" {...itemProps.projectId}>
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
