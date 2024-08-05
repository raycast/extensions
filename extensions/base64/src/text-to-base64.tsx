import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { encode } from "js-base64";
import { update } from "./util/clipboard";

export default function TextToBase64() {
  async function handleSubmit({ text }: { text: string }) {
    if (!text) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter some text to encode",
      });
      return;
    }

    try {
      const encoded = encode(text);
      await update(encoded);
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Encoded text copied to clipboard",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to encode text",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Encode to Base64" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text Input" placeholder="Enter your text here" />
    </Form>
  );
}
