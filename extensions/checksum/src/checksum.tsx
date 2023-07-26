import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { createHash } from "crypto";
import fs from "fs";
import { HashDropdown } from "./components/dropdown";
import { Values } from "./types";

export default function Command() {
  async function handleSubmit(values: Values) {
    const expectedHash = values.textfield;
    const filePath = values.file[0];

    try {
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
    } catch (err) {
      if (err instanceof Error) {
        await showToast({ title: "Error", message: err.message });
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Wand} onSubmit={handleSubmit} title="Verify Checksum" />
        </ActionPanel>
      }
    >
      <Form.TextField id="textfield" title="Reported Checksum" placeholder="Place reported checksum here" />
      <Form.FilePicker id="file" title="File to Compare" allowMultipleSelection={false} />
      <HashDropdown />
    </Form>
  );
}
