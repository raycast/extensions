import { Action, ActionPanel, Form, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

const STORAGE_KEY = "scratchpad";

export default function Scratchpad() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    LocalStorage.getItem<string>(STORAGE_KEY).then((val) => setText(val ?? ""));
  }, []);

  if (text === null) {
    return <Form isLoading />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values: { content: string }) => {
              await LocalStorage.setItem(STORAGE_KEY, values.content);
              await showToast({ style: Toast.Style.Success, title: "Saved" });
            }}
          />
          <Action
            title="Clear Scratchpad"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              setText("");
              await LocalStorage.setItem(STORAGE_KEY, "");
              await showToast({ style: Toast.Style.Success, title: "Cleared" });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="" defaultValue={text} enableMarkdown />
    </Form>
  );
}
