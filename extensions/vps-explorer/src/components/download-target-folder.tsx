import { ActionPanel, Form, Action, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import fs from "fs";

// TODO: to be added later
export default function DownloadTargetFolder({ onSubmit }: { onSubmit: (localPath: string) => void }) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ folders: string[] }>({
    onSubmit(values) {
      const folder = values.folders[0];
      if (!folder || !fs.existsSync(folder) || !fs.lstatSync(folder).isDirectory()) {
        return false;
      }
      onSubmit(folder);
      setTimeout(() => {
        pop();
      }, 2000);
    },
    validation: {
      folders: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        {...itemProps.folders}
        id="folders"
        title="Choose target folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.Description text={"Download the selected file to the current directory"} />
    </Form>
  );
}
