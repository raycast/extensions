import {
  Detail,
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
  openCommandPreferences,
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
    if (result == "error") {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Shakespearify!";
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Shakespearified!";

      if (preferences.copyConvertedText == "yes") {
        Clipboard.copy(result);
        toast.title = "Shakespearified + Copied!";
      }
      if (preferences.pasteConvertedText == "yes") {
        Clipboard.paste(result);
        showHUD("Shakespearified!", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      }
    }

    setConvertedText(result);
  };

  const handleCopyToClipboard = () => {
    Clipboard.copy(convertedText);
    showToast(ToastStyle.Success, "Copied to Clipboard!");
    showHUD("Copied to Clipboard!", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  };

  if (convertedText == "error") {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action icon={Icon.Cog} title="Open Extension Preferences" onAction={openCommandPreferences} />
            <Action.OpenInBrowser title="Contact Developer" url="https://github.com/Binary-Bytes" />
            <Action.OpenInBrowser
              title="Open Setup Guide"
              url="https://github.com/Binary-Bytes/Shakespearify/blob/main/README.md"
            />
          </ActionPanel>
        }
        markdown={`# Failed to Shakespearify!
> Please check your API key in the extension preferences.
>
> For details on how to get an API key, refer to the [Extension Setup Guide](https://github.com/Binary-Bytes/Shakespearify/blob/main/README.md)

---

> If the issue still persists, contact [me (the developer)](https://github.com/Binary-Bytes).`}
      />
    );
  } else {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action icon={Icon.QuoteBlock} title="Shakespearify!" onAction={handleShakespearify} />
            <Action
              icon={Icon.CopyClipboard}
              title="Copy to Clipboard"
              onAction={handleCopyToClipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
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
        <Form.Description title="Converted Text" text={convertedText || "Wise words will appear here..."} />
      </Form>
    );
  }
}
