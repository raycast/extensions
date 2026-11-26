import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { safeRenameProject } from "../services/file-operations";
import { PremiereFile } from "../types";

interface RenameFormProps {
  file: PremiereFile;
  onRenamed?: (newPath: string) => void;
}

interface RenameFormValues {
  title: string;
}

export function RenameForm({ file, onRenamed }: RenameFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<RenameFormValues>({
    async onSubmit(values) {
      const clean = values.title.trim();
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Renaming project...",
      });

      try {
        const newPath = await safeRenameProject(file.path, clean);
        toast.style = Toast.Style.Success;
        toast.title = "Project renamed successfully";
        if (onRenamed) {
          onRenamed(newPath);
        }
        pop();
      } catch (err: unknown) {
        await showFailureToast(err, { title: "Failed to rename project" });
      }
    },
    validation: {
      title(value) {
        if (!value || !value.trim()) {
          return "Project name cannot be empty";
        }
      },
    },
    initialValues: {
      title: file.title,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Current Project" text={`${file.name} (${file.formattedSize})`} />
      <Form.TextField {...itemProps.title} title="New Name" placeholder="Enter new project name" />
      <Form.Description text={`Extension (.${file.extension}) will be preserved automatically.`} />
    </Form>
  );
}
