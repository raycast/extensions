import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  LocalStorage,
  closeMainWindow,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { appendHistory } from "./history";

const DRAFT_STORAGE_KEY = "text-fillin-draft";
const DRAFT_SAVE_DELAY_MS = 300;

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [text, setText] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadDraft = async () => {
      const draft = await LocalStorage.getItem<string>(DRAFT_STORAGE_KEY);
      if (draft) {
        setText(draft);
      }
      setIsReady(true);
    };

    loadDraft();
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      LocalStorage.setItem(DRAFT_STORAGE_KEY, text);
    }, DRAFT_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [text, isReady]);

  const handleSubmit = async () => {
    const normalizedText = text ?? "";

    if (!normalizedText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Text is empty",
        message: "Type something before submitting.",
      });
      return;
    }

    try {
      setIsLoading(true);
      await appendHistory(normalizedText);
      await LocalStorage.setItem(DRAFT_STORAGE_KEY, "");
      await closeMainWindow();
      await Clipboard.paste(normalizedText);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to paste text",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading || !isReady}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Fill Text"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Write temporary text and press Cmd+Enter to fill it into the previously focused app." />
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Type text here..."
        autoFocus
        value={text}
        onChange={setText}
      />
    </Form>
  );
}
