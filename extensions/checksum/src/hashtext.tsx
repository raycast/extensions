import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { createHash } from "crypto";

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
    const buff = values.file;

    const hash = createHash(values.dropdown);
    hash.update(buff);
    const result = hash.digest("hex");
    Clipboard.copy(result);

    showToast({ title: "Files Hash Copied To Clipboard" });

    return null;
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
        id="file"
        title="Text To Hash"
        placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        defaultValue=""
      />
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
