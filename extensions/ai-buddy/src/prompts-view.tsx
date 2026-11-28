import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { texts } from "./texts";
import { defaultInstructions, loadCustomPrompts, PromptId, PROMPTS, saveInstructions } from "./prompts";

/** Edit one buddy's prompt instructions (Home → ⌘K → Edit Prompt); the answer format stays in code. */
export function PromptForm({ id, onSaved }: { id: PromptId; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const t = texts();
  const def = PROMPTS[id];
  const [text, setText] = useState(loadCustomPrompts()[id] ?? defaultInstructions(id));

  return (
    <Form
      navigationTitle={`Prompt · ${def.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Prompt"
            icon={Icon.Check}
            onSubmit={async () => {
              saveInstructions(id, text);
              onSaved?.();
              await showToast({ style: Toast.Style.Success, title: "Prompt saved" });
              pop();
            }}
          />
          <Action
            title="Fill in Default"
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => setText(defaultInstructions(id))}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="instructions"
        title={`✍️ ${t.instructions}`}
        placeholder="Describe the role, tone and rules. Leave empty to use the default."
        value={text}
        onChange={setText}
        enableMarkdown={false}
      />
      <Form.Description title={t.formNoteTitle} text={t.formNote} />
    </Form>
  );
}
