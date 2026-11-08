import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  getFrontmostApplication,
  getSelectedText,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";

export interface Source {
  text: string;
  frontApp: string;
}

export function useSource() {
  const [source, setSource] = useState<Source>();
  useEffect(() => {
    let active = true;
    // Capture the selection at launch, before navigating to a picker or form.
    void Promise.allSettled([
      getSelectedText(),
      getFrontmostApplication(),
    ]).then(([selection, app]) => {
      if (active)
        setSource({
          text: selection.status === "fulfilled" ? selection.value : "",
          frontApp: app.status === "fulfilled" ? app.value.name : "",
        });
    });
    return () => {
      active = false;
    };
  }, []);
  return source;
}

export function SourceLoading() {
  return <Detail isLoading markdown="Reading selected text…" />;
}

export function SourceForm({
  source,
  onSubmit,
  instruction: initialInstruction,
  custom = false,
}: {
  source: Source;
  onSubmit: (source: Source, instruction?: string) => void;
  instruction?: string;
  custom?: boolean;
}) {
  const [text, setText] = useState(source.text);
  const [instruction, setInstruction] = useState(initialInstruction || "");
  const [textError, setTextError] = useState<string>();
  const [instructionError, setInstructionError] = useState<string>();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rewrite Text"
            icon={Icon.Wand}
            onSubmit={() => {
              setTextError(
                text.trim() ? undefined : "Enter some text to rewrite.",
              );
              setInstructionError(
                !custom || instruction.trim()
                  ? undefined
                  : "Describe how you want to change the text.",
              );
              if (text.trim() && (!custom || instruction.trim()))
                onSubmit({ ...source, text }, instruction.trim());
            }}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          />
        </ActionPanel>
      }
    >
      {custom ? (
        <Form.TextField
          id="instruction"
          title="Instruction"
          placeholder="Make it shorter, translate to Spanish, turn into bullet points…"
          value={instruction}
          error={instructionError}
          onChange={(value) => {
            setInstruction(value);
            setInstructionError(undefined);
          }}
        />
      ) : null}
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Select text in another app before opening Recast, or paste it here…"
        value={text}
        error={textError}
        onChange={(value) => {
          setText(value);
          setTextError(undefined);
        }}
      />
      <Form.Description
        title="Your AWS Account"
        text="Text is sent directly to Amazon Bedrock using your AWS credentials. AWS usage charges apply. Recast does not save a rewrite history."
      />
    </Form>
  );
}
