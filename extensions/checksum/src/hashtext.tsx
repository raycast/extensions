import { Form, ActionPanel, Action, showToast, Clipboard, getPreferenceValues, popToRoot, Icon } from "@raycast/api";
import { createHash } from "crypto";
import { HashDropdown } from "./components/dropdown";
import { Values } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  async function handleSubmit(values: Values) {
    const buff = Buffer.from(values.textfield);
    const hash = createHash(values.dropdown);

    hash.update(buff);
    const result = hash.digest("hex");

    await Clipboard.copy(result);
    await showToast({ title: "Texts hash copied to clipboard" });

    if (preferences.popRootAfterSubmit) {
      await popToRoot();
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
      <Form.TextArea
        id="textfield"
        title="Text To Hash"
        placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
      />
      <HashDropdown />
    </Form>
  );
}
