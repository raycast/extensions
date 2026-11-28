import { Action, ActionPanel, Clipboard, Form, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { LLMView, Mode, ReplyLanguage } from "./llm-view";

const LABELS: Record<Mode, { title: string; action: string; field: string; placeholder: string; icon: string }> = {
  translate: {
    title: "Buddy Translate",
    action: "Translate",
    field: "📝 Input",
    placeholder: "Text to translate",
    icon: "buddy-translate.png",
  },
  reply: {
    title: "Buddy Draft Reply",
    action: "Draft Reply",
    field: "💬 Message",
    placeholder: "Message to reply to",
    icon: "buddy-draft-reply.png",
  },
  rewrite: {
    title: "Buddy Polish English",
    action: "Polish",
    field: "📝 Input",
    placeholder: "English draft",
    icon: "buddy-polish.png",
  },
};

/**
 * Shown when a command runs with nothing typed and nothing selected: type the text, then run.
 * Starts with the clipboard text, so copy → run → ⌘↵ works too.
 */
export function InputForm({ mode, replyLanguage }: { mode: Mode; replyLanguage?: ReplyLanguage }) {
  const { push } = useNavigation();
  const [error, setError] = useState<string>();
  const [text, setText] = useState("");
  const [fromClipboard, setFromClipboard] = useState(false);
  const typed = useRef(false);
  const label = LABELS[mode];

  useEffect(() => {
    Clipboard.readText()
      .then((clip) => {
        const value = clip?.trim();
        // Only if nothing was typed yet.
        if (!value || typed.current) return;
        setText(value);
        setFromClipboard(true);
      })
      .catch(() => undefined);
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={label.action}
            icon={label.icon}
            onSubmit={() => {
              if (!text.trim()) return setError("Please input some text");
              push(<LLMView mode={mode} text={text.trim()} startedAt={Date.now()} replyLanguage={replyLanguage} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title={label.field}
        placeholder={label.placeholder}
        error={error}
        value={text}
        onChange={(value) => {
          typed.current = true;
          setText(value);
          setFromClipboard(false);
          if (error) setError(undefined);
        }}
        autoFocus
      />
      <Form.Description
        text={`${label.title} · ${fromClipboard ? "From the clipboard. " : ""}⌘↵ to ${label.action.toLowerCase()}`}
      />
    </Form>
  );
}
