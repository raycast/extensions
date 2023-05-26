import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
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
    const expectedHash = values.textfield;

    for (const filePath of values.file) {
      const buff = fs.readFileSync(filePath);

      const hash = createHash(values.dropdown);
      hash.update(buff);
      const result = hash.digest("hex");

      if (expectedHash === result) {
        showToast({
          title: "Hashes match!",
          message: "The file hash matches the expected hash.",
        });
      } else {
        showToast({
          title: "Hashes don't match!",
          message: "The file hash does not match the expected hash.",
          style: Toast.Style.Failure,
        });
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="textfield"
        title="Reported Checksum"
        placeholder="Place reported checksum here"
        defaultValue=""
      />
      <Form.FilePicker id="file" title="File to Compare" allowMultipleSelection={false} />
      <HashDropdown />
    </Form>
  );
}
