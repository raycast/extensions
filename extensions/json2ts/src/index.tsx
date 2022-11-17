import { Form, ActionPanel, Action, showToast, showHUD, popToRoot, Toast, Clipboard } from "@raycast/api";
import { json2ts } from "json-ts";

interface CommandForm {
  jsonTextarea: string;
  rootName: string;
}

export default function Command() {
  async function handleSubmit(values: CommandForm) {
    const { jsonTextarea, rootName } = values;

    if (jsonTextarea.length === 0) {
      await showToast(Toast.Style.Failure, "Empty JSON");
      return;
    }

    if (rootName.length === 0) {
      await showToast(Toast.Style.Failure, "Empty interface name");
      return;
    }

    try {
      const ts = json2ts(values.jsonTextarea, { rootName, flow: false, prefix: "" });
      await Clipboard.copy(ts);
    } catch (e) {
      await showToast(Toast.Style.Failure, "Invalid JSON");
      return;
    }

    await showHUD("Copied to clipboard");
    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Generate" />
        </ActionPanel>
      }
    >
      <Form.TextArea id="jsonTextarea" title="JSON" placeholder="Enter JSON here" />
      <Form.TextField id="rootName" title="Interface Name" defaultValue="rootName" />
    </Form>
  );
}
