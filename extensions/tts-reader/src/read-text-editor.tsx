import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSelectedTextOrClipboard } from "./text-source";
import { useTTS } from "./useTTS";

function getCompletionTitle(completion: "finished" | "stopped", engine?: string): string {
  if (completion === "stopped") {
    return engine ? `Playback interrupted (${engine})` : "Playback interrupted";
  }

  return engine ? `Finished speaking (${engine})` : "Finished speaking";
}

export default function Command() {
  const [text, setText] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const { isReady, speak, isLoading, error } = useTTS();
  const { pop } = useNavigation();

  useEffect(() => {
    async function fetchText() {
      try {
        const { text: fetched, source } = await getSelectedTextOrClipboard();
        setText(fetched);
        if (source === "clipboard" && fetched.trim()) {
          showToast({ style: Toast.Style.Success, title: "Loaded clipboard text" });
        }
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
      const { warnings, completion, engine } = await speak(text);
      await showToast({
        style: Toast.Style.Success,
        title: getCompletionTitle(completion, engine),
        message: warnings.length > 0 ? warnings.join("; ") : undefined,
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
