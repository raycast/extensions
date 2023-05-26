import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import { createHash } from "crypto";
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
    const buff = Buffer.from(values.textfield);

    const hash = createHash(values.dropdown);
    hash.update(buff);
    const result = hash.digest("hex");
    Clipboard.copy(result);

    showToast({ title: "Texts hash copied to clipboard" });

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
      <Form.TextArea
        id="textfield"
        title="Text To Hash"
        placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        defaultValue=""
      />
      <HashDropdown />
    </Form>
  );
}
