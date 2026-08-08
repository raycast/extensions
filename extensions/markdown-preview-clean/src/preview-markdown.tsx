import { useState } from "react";
import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast, useNavigation, Keyboard } from "@raycast/api";
import { MarkdownPreview } from "./markdown-preview";
import HistoryList from "./history-list";

export default function Command() {
  const [markdown, setMarkdown] = useState("");
  const { push } = useNavigation();

  const handleSubmit = (values: { markdown: string }) => {
    const content = values.markdown ?? markdown;
    if (!content.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Nothing to preview", message: "Enter some Markdown first" });
      return;
    }
    push(<MarkdownPreview markdown={content} backTitle="Back to Editor" navigationTitle="Markdown Preview" />);
  };

  const pasteFromClipboard = async () => {
    const text = await Clipboard.readText();
    if (!text?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
      return;
    }
    setMarkdown(text);
    showToast({ style: Toast.Style.Success, title: "Pasted from clipboard" });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Markdown" icon={Icon.Eye} onSubmit={handleSubmit} />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={pasteFromClipboard}
          />
          <Action
            title="Open History"
            icon={Icon.Clock}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            onAction={() => push(<HistoryList />)}
          />
          <Action
            title="Clear"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            onAction={() => setMarkdown("")}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="markdown"
        title="Markdown"
        placeholder="# Heading

**Bold**, *italic*, code

- list item"
        value={markdown}
        onChange={setMarkdown}
        enableMarkdown={true}
      />
    </Form>
  );
}
