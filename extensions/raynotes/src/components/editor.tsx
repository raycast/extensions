import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { writeFileSync } from "node:fs";
import { Note, slugify, titleOf, uniqueNotePath } from "../lib/notes";

const AUTOSAVE_DELAY_MS = 500;

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface EditorProps {
  root: string;
  /** Omitted for a new note, which gets a file on its first autosave. */
  note?: Note;
  /** Called after every successful write, for callers showing a note list. */
  onSaved?: () => void;
  /** What "Save and Close" does — pop a view, or close Raycast entirely. */
  onClose: () => void;
}

/**
 * A single text area, like the native notes window: the first line is the title,
 * so there is no separate title field.
 */
export function Editor({ root, note, onSaved, onClose }: EditorProps) {
  const [content, setContent] = useState(note?.content ?? "");

  const path = useRef(note?.path);
  const latest = useRef(content);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipUnmountSave = useRef(false);

  const persist = useCallback((): boolean => {
    const text = latest.current;
    // A new note that never received content is discarded instead of written.
    if (!path.current && !text.trim()) return true;
    if (!path.current) path.current = uniqueNotePath(root, slugify(titleOf(text)));

    try {
      writeFileSync(path.current, text);
      onSaved?.();
      return true;
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Could not save", message: describe(error) });
      return false;
    }
  }, [root, onSaved]);

  function handleChange(text: string) {
    setContent(text);
    latest.current = text;
    clearTimeout(timer.current);
    timer.current = setTimeout(persist, AUTOSAVE_DELAY_MS);
  }

  // Flush on unmount so escaping out of the form keeps the last keystrokes.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (!skipUnmountSave.current) persist();
    },
    [persist],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.SaveDocument}
            title="Save and Close"
            // Enter ends a capture; ⇧Enter still breaks the line for longer notes.
            shortcut={{ modifiers: [], key: "return" }}
            onSubmit={() => {
              clearTimeout(timer.current);
              if (persist()) {
                skipUnmountSave.current = true;
                onClose();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="" placeholder="Write…" value={content} onChange={handleChange} autoFocus />
    </Form>
  );
}
