import {
  Form,
  ActionPanel,
  SubmitFormAction,
  showToast,
  ToastStyle,
  copyTextToClipboard,
  showHUD,
  popToRoot,
} from "@raycast/api";
import { json2ts } from "json-ts";

interface CommandForm {
  jsonTextarea: string;
  rootName: string;
}

export default function Command() {
  async function handleSubmit(values: CommandForm) {
    const { jsonTextarea, rootName } = values;

    if (jsonTextarea.length === 0) {
      await showToast(ToastStyle.Failure, "Empty JSON");
      return;
    }

    if (rootName.length === 0) {
      await showToast(ToastStyle.Failure, "Empty interface name");
      return;
    }

    try {
      const ts = json2ts(values.jsonTextarea, { rootName, flow: false, prefix: "" });
      await copyTextToClipboard(ts);
    } catch (e) {
      await showToast(ToastStyle.Failure, "Invalid JSON");
      return;
    }

    await showHUD("Copied to clipboard");
    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="jsonTextarea" title="JSON" placeholder="Enter JSON here" />
      <Form.TextField id="rootName" title="Interface Name" defaultValue="rootName" />
    </Form>
  );
}
