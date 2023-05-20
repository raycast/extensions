import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { createHash } from "crypto";
import fs from "fs";

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
          title: "Hashes Match!",
          message: "The file hash matches the expected hash.",
        });
      } else {
        showToast({
          title: "Hashes Do Not Match!",
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
      <Form.Description text="" />
      <Form.TextField
        id="textfield"
        title="Reported Checksum"
        placeholder="Place reported checksum here"
        defaultValue=""
      />
      <Form.FilePicker id="file" title="File To Compare" />
      <Form.Dropdown id="dropdown" title="Hashing Algorithm">
        <Form.Dropdown.Item value="sha1" title="sha1" />
        <Form.Dropdown.Item value="sha224" title="sha224" />
        <Form.Dropdown.Item value="sha256" title="sha256" />
        <Form.Dropdown.Item value="sha512" title="sha512" />
      </Form.Dropdown>
    </Form>
  );
}
