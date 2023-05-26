import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import { createHash } from "crypto";
import fs from "fs";
import { HashDropdown } from "./components/dropdown";

type Values = {
  textfield: string; // Expected hash
  textarea: string;
  datepicker: Date;
  checkbox: boolean;
  dropdown: string;
  tokeneditor: string[];
  file: string[]; // Array of file paths
};

export default function Command() {
  function handleSubmit(values: Values) {
    for (const filePath of values.file) {
      const buff = fs.readFileSync(filePath);

      const hash = createHash(values.dropdown);
      hash.update(buff);
      const result = hash.digest("hex");
      Clipboard.copy(result);

      showToast({ title: "File hash copied to clipboard" });
    }
    return true;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="file" title="File to Hash" allowMultipleSelection={false} />
      <HashDropdown />
    </Form>
  );
}
