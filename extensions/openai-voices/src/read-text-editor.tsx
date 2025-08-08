import { Action, ActionPanel, Clipboard, Form, getSelectedText, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { play } from "./play";
import { useTTS } from "./useTTS";

export default function Command() {
  const [text, setText] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const { isReady, speak, isLoading, error } = useTTS();
  const { pop } = useNavigation();

  useEffect(() => {
    async function fetchText() {
      try {
        const selectedText = await getSelectedText();
        setText(selectedText);
      } catch {
        const clipboardText = (await Clipboard.readText()) ?? "";
        setText(clipboardText);
      } finally {
        setIsInitializing(false);
      }
    }
    fetchText();
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration error",
        message: error.message,
      });
    }
  }, [error]);

  async function handleSubmit() {
    if (!text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text to speak",
        message: "Please enter some text in the text area.",
      });
      return;
    }

    if (!isReady) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not ready to speak",
        message: "Please configure the extension first.",
      });
      return;
    }

    try {
      const { audio, format } = await speak(text);
      await play(audio, format);
      await showToast({
        style: Toast.Style.Success,
        title: "Finished speaking",
      });
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate speech",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading || isInitializing}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Read Aloud" onSubmit={handleSubmit} />
          <Action title="Clear Text" onAction={() => setText("")} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text to Read"
        placeholder="Enter or paste text here"
        value={text}
        onChange={setText}
      />
    </Form>
  );
}
