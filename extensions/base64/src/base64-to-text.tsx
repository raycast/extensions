import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { decode, isValid } from "js-base64";
import { update } from "./util/clipboard";

export default function DecodeBase64() {
  async function handleSubmit({ base64 }: { base64: string }) {
    if (!base64) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a base64 string",
      });
      return;
    }

    if (!isValid(base64)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Invalid base64 string. Please check your input.",
      });
      return;
    }

    try {
      const decoded = decode(base64);

      await update(decoded);
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Decoded text copied to clipboard",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to decode base64 string",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decode Base64" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="base64" title="Base64 Input" placeholder="Paste your base64 string here" />
    </Form>
  );
}
