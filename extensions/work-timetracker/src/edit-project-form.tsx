import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import type { Project } from "@models";
import { readItem, writeItem } from "@utils/storage-helper";

/**
 * Props for the EditProjectForm component.
 */
interface EditProjectFormProps {
  /** The project object to be edited. */
  project: Project;
  /** Callback function to be invoked when the project is successfully edited, typically to refresh a list. */
  onProjectEdited: () => void;
}

/**
 * Form component for editing an existing project's name.
 * Pre-fills with the current project name and allows modification.
 * Validates the new name for emptiness and uniqueness before saving to LocalStorage.
 * @param props - The properties for the component, including the project and a callback.
 */
export default function EditProjectForm({ project, onProjectEdited }: EditProjectFormProps) {
  const { pop } = useNavigation();

  interface FormValues {
    projectName: string;
  }

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: { projectName: project.name },
    validation: {
      projectName: FormValidation.Required,
    },
    async onSubmit(values) {
      const trimmedNewName = values.projectName.trim();

      try {
        let projects = await readItem("projects");

        const duplicateExists = projects.some(
          (p) => p.id !== project.id && p.name.toLowerCase() === trimmedNewName.toLowerCase(),
        );

        if (duplicateExists) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Duplicate Project",
            message: "A project with this name already exists.",
          });
          return;
        }

        projects = projects.map((p) => (p.id === project.id ? { ...p, name: trimmedNewName } : p));

        await writeItem("projects", projects);
        await showToast({
          style: Toast.Style.Success,
          title: "Project Updated",
          message: `"${trimmedNewName}" has been updated.`,
        });

        onProjectEdited();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update project",
          message: "Could not save changes.",
        });
        console.error("Failed to update project:", error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} icon={Icon.SaveDocument} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Editing project: ${project.name}`} />
      <Form.TextField title="New Project Name" placeholder="Enter new project name" {...itemProps.projectName} />
    </Form>
  );
}
