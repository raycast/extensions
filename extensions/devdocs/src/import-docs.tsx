import { ActionPanel, Form, Action, LocalStorage, showToast, Toast } from "@raycast/api";
import fs from "fs";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import"
            onSubmit={(values: { files: string[] }) => {
              const file = values.files[0];
              if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
                return false;
              }
              const contents = fs.readFileSync(file, "utf8");
              const docString = JSON.parse(contents); //["docs"];
              saveDocs(docString);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        allowMultipleSelection={false}
        info="Import a JSON file from the DevDocs.io Settings page to set your preferred documentations."
      />
    </Form>
  );
}

export async function saveDocs(docs: String) {
  await LocalStorage.setItem("docs", JSON.stringify(docs));
  showToast({
    title: `Successfully imported documentation`,
    style: Toast.Style.Success,
  });
}
