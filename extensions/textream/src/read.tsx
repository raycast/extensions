import { Action, ActionPanel, Clipboard, captureException, Form, getSelectedText, open, showHUD } from "@raycast/api";
import { showFailureToast, useForm, usePromise } from "@raycast/utils";
import { saveToHistory } from "./lib/history-storage";

interface FormValues {
  text: string;
}

async function getInitialText() {
  let initialText = "";

  // Priority 1: Selected text
  try {
    initialText = (await getSelectedText()).trim();
  } catch {
    // No selected text or accessibility permission denied
  }

  // Priority 2: Clipboard (fallback)
  if (!initialText) {
    try {
      const clipboardText = await Clipboard.readText();
      initialText = clipboardText?.trim() || "";
    } catch {
      // Clipboard read failed
    }
  }

  return initialText;
}

export default function Command() {
  // ── Step 1: Initialize form with useForm hook ──
  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    async onSubmit(values) {
      const text = values.text.trim();

      if (!text) {
        await showFailureToast("No text to send", {
          title: "Empty text",
          message: "Please enter some text to read in Textream.",
        });
        return;
      }

      const url = `textream://read?text=${encodeURIComponent(text)}`;

      // ── Step 2: Launch ──
      try {
        await saveToHistory(text);
        await open(url);
        await showHUD("Sent to Textream ✓");
      } catch (error) {
        captureException(error);
        await showFailureToast(error, {
          title: "Could not open Textream",
        });
      }
    },
    initialValues: {
      text: "",
    },
  });

  // ── Step 3: Fetch initial text using usePromise ──
  const { isLoading } = usePromise(getInitialText, [], {
    onData: (data) => {
      if (data) {
        setValue("text", data);
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send to Textream" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Text" placeholder="Enter text to read in Textream overlay…" {...itemProps.text} />
      <Form.Description text="Tip: Select text anywhere or copy to clipboard before running this command for instant prefill." />
    </Form>
  );
}
