import { ActionPanel, Action, Form, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { randomUUID } from "crypto";
import { useForm, FormValidation } from "@raycast/utils";
import type { Project } from "@models";
import { readItem, writeItem } from "@utils/storage-helper";

/**
 * Command component for adding a new project.
 * Displays a form with a field for the project name.
 * On submission, it validates the name, checks for duplicates,
 * and then saves the new project to LocalStorage.
 */
export default function AddNewProjectCommand() {
  const { pop } = useNavigation();

  interface FormValues {
    name: string;
    mondayGroupId: string;
  }

  const { handleSubmit, itemProps } = useForm<FormValues>({
    validation: {
      name: FormValidation.Required,
    },
    async onSubmit(values) {
      const projectName = values.name.trim();

      try {
        const projects = await readItem("projects");

        if (projects.find((p) => p.name.toLowerCase() === projectName.toLowerCase())) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Project already exists",
            message: "A project with this name is already registered.",
          });
          return;
        }

        const newProject: Project = {
          id: randomUUID(),
          name: projectName,
          mondayGroupId: values.mondayGroupId.trim() || undefined,
        };

        projects.push(newProject);
        await writeItem("projects", projects);
        await showToast({
          style: Toast.Style.Success,
          title: "Project Added",
          message: `"${projectName}" has been added.`,
        });
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add project",
          message: "Could not save the project.",
        });
        console.error("Failed to add project:", error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Project" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new project to track your time against." />
      <Form.TextField title="Project Name" placeholder="Enter project name" {...itemProps.name} />
      <Form.TextField title="Monday Group ID" placeholder="(optional) group_mks8hdc5" {...itemProps.mondayGroupId} />
    </Form>
  );
}
