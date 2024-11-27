import { Form, ActionPanel, Action, showToast, Clipboard, getPreferenceValues, popToRoot, Icon } from "@raycast/api";
import { createHash } from "crypto";
import fs from "fs";
import { HashDropdown } from "./components/dropdown";
import { Values } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  async function handleSubmit(values: Values) {
    const filePath = values.file[0];

    try {
      const buff = fs.readFileSync(filePath);

      const hash = createHash(values.dropdown);
      hash.update(buff);
      const result = hash.digest("hex");
      await Clipboard.copy(result);

      await showToast({ title: "File hash copied to clipboard" });
      if (preferences.popRootAfterSubmit) {
        await popToRoot();
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
          <Action.SubmitForm icon={Icon.Wand} onSubmit={handleSubmit} title="Get Hash" />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="file" title="File to Hash" allowMultipleSelection={false} />
      <HashDropdown />
    </Form>
  );
}
