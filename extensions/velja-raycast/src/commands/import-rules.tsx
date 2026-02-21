import { Action, ActionPanel, Clipboard, Form, Toast, showToast } from "@raycast/api";
import { importRulesFromJson } from "../lib/rules";

type FormValues = {
  rulesJson: string;
  readFromClipboard: boolean;
};

export default function Command() {
  async function handleSubmit(values: FormValues) {
    await showToast({ style: Toast.Style.Animated, title: "Importing rules..." });

    try {
      const source = values.readFromClipboard ? await Clipboard.readText() : values.rulesJson;
      if (!source || !source.trim()) {
        throw new Error("No rules JSON found. Paste JSON or enable clipboard import.");
      }

      const importedCount = importRulesFromJson(source);
      await showToast({
        style: Toast.Style.Success,
        title: "Imported rules",
        message: `${importedCount} rule(s) imported`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not import rules",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Rules" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Checkbox id="readFromClipboard" label="Read Rules JSON from Clipboard" />
      <Form.TextArea
        id="rulesJson"
        title="Rules JSON"
        placeholder='[{"id":"...","title":"...","browser":"com.apple.Safari",...}]'
      />
    </Form>
  );
}
