import { ActionPanel, Form, Action } from "@raycast/api";
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
              console.log(file);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" allowMultipleSelection={false} />
    </Form>
  );
}
