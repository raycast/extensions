import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
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
    for (const filePath of values.file) {
      const buff = fs.readFileSync(filePath);

      const hash = createHash(values.dropdown);
      hash.update(buff);
      const result = hash.digest("hex");
      Clipboard.copy(result);

      showToast({ title: "Files Hash Copied To Clipboard" });
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
      <Form.Description text="" />
      <Form.FilePicker id="file" title="File To Hase" allowMultipleSelection={false} />
      <Form.Dropdown id="dropdown" title="Hashing Algorithm">
        <Form.Dropdown.Item value="sha1" title="sha1" />
        <Form.Dropdown.Item value="sha224" title="sha224" />
        <Form.Dropdown.Item value="sha256" title="sha256" />
        <Form.Dropdown.Item value="sha512" title="sha512" />
        <Form.Dropdown.Item value="md4" title="md4" />
        <Form.Dropdown.Item value="md5" title="md5" />
        <Form.Dropdown.Item value="sm3" title="sm3" />
      </Form.Dropdown>
    </Form>
  );
}
