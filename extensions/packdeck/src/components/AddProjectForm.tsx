import fs from "node:fs";
import path from "node:path";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { addCustomProjectPath, setActiveProjectPath } from "../lib/storage";

interface AddProjectFormProps {
  onAdded?: () => unknown;
}

interface AddProjectFormValues {
  folder: string[];
  setActive: boolean;
}

export function AddProjectForm({ onAdded }: AddProjectFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<AddProjectFormValues>({
    initialValues: {
      folder: [],
      setActive: true,
    },
    validation: {
      folder: (value) => {
        const selected = value?.[0];
        if (!selected) return "Please select a project folder.";
        if (!fs.existsSync(path.join(selected, "package.json"))) {
          return "Selected directory does not contain a package.json file.";
        }
      },
    },
    async onSubmit(values) {
      const selected = values.folder[0];
      await addCustomProjectPath(selected);
      if (values.setActive) {
        await setActiveProjectPath(selected);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Project added",
        message: path.basename(selected),
      });

      await onAdded?.();
      pop();
    },
  });

  return (
    <Form
      navigationTitle="Add Local Project"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Project" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="Project Directory"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        {...itemProps.folder}
      />
      <Form.Checkbox label="Set as active project immediately" {...itemProps.setActive} />
      <Form.Description
        title="Tip"
        text="You can also configure automatic discovery folders under Packdeck extension preferences (Project Directories)."
      />
    </Form>
  );
}
