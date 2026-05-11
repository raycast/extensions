import { ActionPanel, Form, Action, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import fs from "fs";

// TODO: to be added later
export default function UploadFile({ onSubmit }: { onSubmit: (localPath: string) => void }) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ files: string[] }>({
    onSubmit(values) {
      const file = values.files[0];
      if (!file || !fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
        return false;
      }
      onSubmit(file);
      setTimeout(() => {
        pop();
      }, 2000);
    },
    validation: {
      files: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        {...itemProps.files}
        id="files"
        title="Choose file to upload"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
      />
      <Form.Description text={"Upload the selected file to the current directory"} />
    </Form>
  );
}
