import { Action, ActionPanel, Form, showHUD, Toast, showToast, showInFinder } from "@raycast/api";
import { useForm } from "@raycast/utils";
import fs from "fs";
import path from "path";

interface Props {
  languageName: string;
  content: string;
}

export function ExportForm({ languageName, content }: Props) {
  const { handleSubmit, itemProps } = useForm<{ directory: string[] }>({
    async onSubmit(values) {
      try {
        const dir = values.directory[0];
        const filePath = path.join(dir, `${languageName.toLowerCase().replace(/\s+/g, "-")}-vocab.txt`);
        fs.writeFileSync(filePath, content, "utf-8");
        await showInFinder(filePath);
        await showHUD(`Exported to ${filePath}`);
      } catch (e) {
        await showToast({ style: Toast.Style.Failure, title: (e as Error).message });
      }
    },
    validation: {
      directory: (value) => {
        if (!value || value.length === 0) return "Please select a directory";
      },
    },
  });

  return (
    <Form
      navigationTitle="Export"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        {...itemProps.directory}
        title="Save To"
        info="Select a directory to save the exported vocabulary file"
        allowMultipleSelection={false}
        canChooseFiles={false}
        canChooseDirectories={true}
      />
    </Form>
  );
}
