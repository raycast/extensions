import { Form, Clipboard, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { rewrapText } from "./utils/rewrapText";
import { validateWidth, formatWrappingMessage } from "./utils/validation";
import { RewrapActions } from "./components/RewrapActions";

interface FormValues {
  text: string;
  width: string;
  copyResultToClipboard: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [rewrappedText, setRewrappedText] = useState<string>("");

  async function handleSubmit(values: FormValues) {
    const validation = validateWidth(values.width);

    if (!validation.isValid) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid width",
        message: validation.error!,
      });
      return;
    }

    const wrapped = rewrapText(values.text, validation.value);
    setRewrappedText(wrapped);

    const message = formatWrappingMessage(validation.value);

    if (values.copyResultToClipboard) {
      await Clipboard.copy(wrapped);
      showToast({
        style: Toast.Style.Success,
        title: "Text rewrapped and copied!",
        message,
      });
    } else {
      showToast({
        style: Toast.Style.Success,
        title: "Text rewrapped!",
        message,
      });
    }
  }

  return (
    <Form actions={<RewrapActions onSubmit={handleSubmit} rewrappedText={rewrappedText} />}>
      <Form.TextArea id="text" title="Text" placeholder="Enter text to rewrap..." />
      <Form.TextField
        id="width"
        title="Width"
        placeholder="Leave blank for no wrapping, or enter a number like 80"
        defaultValue={preferences.defaultWidth || "80"}
      />
      <Form.Checkbox
        id="copyResultToClipboard"
        label="Copy result to Clipboard?"
        defaultValue={preferences.defaultCopyToClipboard ?? true}
      />
      {rewrappedText && <Form.Description title="Rewrapped Text" text={rewrappedText} />}
    </Form>
  );
}
