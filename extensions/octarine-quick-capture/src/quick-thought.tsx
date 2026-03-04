import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { appendToJournal } from "./utils/octarine";
import { useState } from "react";

interface FormValues {
  text: string;
}

export default function Command() {
  const [text, setText] = useState("");

  async function handleSubmit(values: FormValues) {
    if (!values.text || values.text.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty thought",
        message: "Write or dictate something first",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Octarine...",
    });

    try {
      await appendToJournal(values.text.trim());
      toast.style = Toast.Style.Success;
      toast.title = "✓ Added to Journal";
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save to Journal"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action.SubmitForm
            title="Save and New"
            onSubmit={async (values: FormValues) => {
              if (!values.text || values.text.trim() === "") {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Empty thought",
                  message: "Write or dictate something first",
                });
                return;
              }

              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Saving to Octarine...",
              });

              try {
                await appendToJournal(values.text.trim());
                toast.style = Toast.Style.Success;
                toast.title = "✓ Added to Journal";
                setText("");
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to save";
                toast.message =
                  error instanceof Error ? error.message : String(error);
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Quick Thought"
        placeholder="What's on your mind? (Fn Fn to dictate)"
        value={text}
        onChange={setText}
        autoFocus
      />
      <Form.Description text="⌘S — save & close  ·  ⌘⇧S — save & add another" />
    </Form>
  );
}
