import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { candidateText } from "./candidate-text";
import { PopupView } from "./popup";
import { supervocPreferences } from "./preferences";
import { ANALYSIS_TEXT_MAX_LENGTH, CONTEXT_MAX_LENGTH } from "./supervoc-api";

function validateText(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return "Text cannot be empty";
  if (trimmed.length > ANALYSIS_TEXT_MAX_LENGTH) {
    return `Text must be at most ${ANALYSIS_TEXT_MAX_LENGTH} characters`;
  }
  return undefined;
}

function validateContext(context: string): string | undefined {
  return context.length > CONTEXT_MAX_LENGTH
    ? `Context must be at most ${CONTEXT_MAX_LENGTH} characters`
    : undefined;
}

export default function CaptureCommand() {
  const { push } = useNavigation();
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [textError, setTextError] = useState<string | undefined>();
  const [contextError, setContextError] = useState<string | undefined>();

  useEffect(() => {
    if (!supervocPreferences().prefill) return;
    let cancelled = false;
    candidateText().then((value) => {
      if (!cancelled && value) setText(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function submit() {
    const nextTextError = validateText(text);
    const nextContextError = validateContext(context);
    setTextError(nextTextError);
    setContextError(nextContextError);
    if (nextTextError || nextContextError) return;
    push(<PopupView text={text.trim()} context={context.trim()} />);
  }

  return (
    <Form
      navigationTitle="Capture"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Capture"
            icon={Icon.Globe}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="An English word, phrase, or sentence"
        value={text}
        error={textError}
        onChange={(value) => {
          setText(value);
          if (textError) setTextError(undefined);
        }}
        enableMarkdown={false}
        autoFocus
      />
      <Form.TextArea
        id="context"
        title="Context"
        placeholder="The sentence around the text (optional)"
        value={context}
        error={contextError}
        onChange={(value) => {
          setContext(value);
          if (contextError) setContextError(undefined);
        }}
        enableMarkdown={false}
      />
      <Form.Description text="Supervoc shows the quick translation and the analysis, and saves every candidate as an entry." />
    </Form>
  );
}
