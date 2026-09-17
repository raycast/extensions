import { Action, ActionPanel, Form, useNavigation, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import fs from "fs";

export function ImportForm({ onImport }: { onImport: (content: string) => void | Promise<void> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ files: string[] }>({
    async onSubmit(values) {
      try {
        const file = values.files[0];
        const content = fs.readFileSync(file, "utf-8");
        await onImport(content);
        pop();
      } catch (e) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to import", message: (e as Error).message });
      }
    },
    validation: {
      files: (value) => {
        if (!value || value.length === 0) return "Please select a file";
      },
    },
  });

  return (
    <Form
      navigationTitle="Import"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        {...itemProps.files}
        title="Select File"
        info="File should be a text file with lines in the format: timestamp | word - translation"
        allowMultipleSelection={false}
        canChooseFiles={true}
        canChooseDirectories={false}
      />
    </Form>
  );
}
