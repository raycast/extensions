import {
  ActionPanel,
  Action,
  Form,
  Clipboard,
  Toast,
  showToast,
  ToastStyle,
  showHUD,
  PopToRootType,
  Keyboard,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { shakespearify } from "./shakespearify";

export default function Command() {
  const [text, setText] = useState("");
  const [convertedText, setConvertedText] = useState("");

  const handleShakespearify = async () => {
    const preferences = getPreferenceValues();
    const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Shakespearifying...",
    });

    const result = await shakespearify(text);
    toast.style = Toast.Style.Success;
    toast.title = "Shakespearified!";

    setConvertedText(result);

    if (preferences.copyConvertedText == "yes") {
        Clipboard.copy(result);
        toast.title = "Shakespearified + Copied!";
    }
    if (preferences.pasteConvertedText == "yes") {
        Clipboard.paste(result);
        showHUD("Shakespearified!", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    }
  };

  const handleCopyToClipboard = () => {
    Clipboard.copy(convertedText);
    showToast(ToastStyle.Success, "Copied to Clipboard!");
    showHUD("Copied to Clipboard!", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action icon={Icon.QuoteBlock} title="Shakespearify!" onAction={handleShakespearify} />
          <Action icon={Icon.CopyClipboard} title="Copy to Clipboard" onAction={handleCopyToClipboard} shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        autoFocus
        id="text"
        title="Enter Text"
        placeholder="Enter text to Shakespearify..."
        value={text}
        onChange={setText}
      />
      <Form.Separator />
      <Form.Description
        title="Converted Text"
        text={convertedText || "Wise words will appear here..."}
      />
    </Form>
  );
}
