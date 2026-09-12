import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Clipboard, Form, Icon } from "@raycast/api";
import { InputSource, JsonDocument, readDocument } from "../document";
import { saveDraft } from "../draft";

interface Props {
  initialSource: string;
  inputSource: InputSource;
  initialError?: string;
  onAccept: (document: JsonDocument) => void;
}

export default function InputForm({ initialSource, inputSource, initialError, onAccept }: Props) {
  const [source, setSource] = useState(initialSource);
  const [origin, setOrigin] = useState(inputSource);
  const [error, setError] = useState(initialError);
  const [draftStatus, setDraftStatus] = useState(inputSource === "Restored Draft" ? "Draft restored" : "");
  const [isLoading, setIsLoading] = useState(false);
  const version = useRef(0);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      version.current++;
    };
  }, []);

  function updateSource(value: string, nextOrigin: InputSource = "Manual Input") {
    const request = ++version.current;
    setSource(value);
    setOrigin(nextOrigin);
    setError(undefined);
    setDraftStatus("Saving draft…");
    void saveDraft(value)
      .then(() => {
        if (active.current && request === version.current) setDraftStatus(value.trim() ? "Draft saved" : "");
      })
      .catch(() => {
        if (active.current && request === version.current)
          setDraftStatus("Draft could not be saved. Keep this input open until finished.");
      });
  }

  async function submit(value: string, nextOrigin = origin) {
    const parsed = readDocument(value, nextOrigin);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const request = ++version.current;
    setIsLoading(true);
    try {
      await saveDraft("");
      if (active.current && request === version.current) onAccept(parsed.document);
    } catch {
      if (active.current) setError("Could not update the saved draft. Your input is still here; try again.");
    } finally {
      if (active.current) setIsLoading(false);
    }
  }

  async function loadClipboard() {
    const request = ++version.current;
    setIsLoading(true);
    try {
      const text = await Clipboard.readText();
      if (!active.current || request !== version.current) return;
      if (!text?.trim()) {
        setError("Clipboard is empty. Your input has been kept.");
        return;
      }
      updateSource(text, "Clipboard");
      await submit(text, "Clipboard");
    } catch {
      if (active.current && request === version.current)
        setError("Could not read the clipboard. Paste JSON into the input to continue.");
    } finally {
      if (active.current) setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Edit JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="View JSON"
            icon={Icon.Eye}
            onSubmit={(values: { input: string }) => submit(values.input)}
          />
          <Action
            title="Read Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={loadClipboard}
          />
          <Action
            title="Clear Input"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={() => updateSource("")}
          />
          <Action
            title="New Input"
            icon={Icon.NewDocument}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => updateSource("")}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="JSON"
        value={source}
        error={error}
        autoFocus
        placeholder='{"name":"Raycast","items":[1,2,3]}'
        onChange={(value) => updateSource(value)}
      />
      <Form.Description title="Source" text={[origin, draftStatus].filter(Boolean).join(" · ")} />
      <Form.Description text="View JSON with ⌘↵. Nested JSON is automatically deserialized at every depth. The original input is kept." />
    </Form>
  );
}
