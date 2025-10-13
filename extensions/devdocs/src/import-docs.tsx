import { ActionPanel, Form, Action, LocalStorage, showToast, Toast, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";
import fs from "fs";

interface ImportFormValues {
  file: string[];
}

export default function ImportDocs(): JSX.Element {
  const { handleSubmit, itemProps } = useForm<ImportFormValues>({
    onSubmit(values) {
      const contents = fs.readFileSync(values.file[0], "utf8");
      const docString = JSON.parse(contents);

      saveDocs(JSON.stringify(docString));
      showToast({
        style: Toast.Style.Success,
        title: "Successfully imported documentation",
        message: `${values.file} account created`,
      });
    },
    validation: {
      file: (value) => {
        const filename = value ? value[0] : "";

        if (!filename) {
          return "The item is required";
        } else if (!fs.existsSync(filename)) {
          return "File does not exist";
        } else if (!filename.endsWith(".json")) {
          return "Must be JSON file";
        }

        const contents = fs.readFileSync(filename, "utf8");
        const docString = JSON.parse(contents);

        if (!Object.keys(docString).includes("docs")) {
          return "Must use top-level 'docs' key";
        }
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        allowMultipleSelection={false}
        info="Import a JSON file from the DevDocs.io Settings page to set your preferred documentations."
        {...itemProps.file}
      />
    </Form>
  );
}

export async function saveDocs(docs: string): Promise<void> {
  await LocalStorage.setItem("docs", JSON.stringify(docs));
  popToRoot();
}
