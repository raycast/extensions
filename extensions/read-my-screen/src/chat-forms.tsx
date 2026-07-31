import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { MODEL_PREFERENCE_OPTIONS } from "./model";

export type SavePresetFormValues = { title: string };

export function SavePresetForm({
  promptToSave,
  onSave,
}: {
  promptToSave: string;
  onSave: (title: string, prompt: string) => void;
}) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Preset"
            icon={Icon.Plus}
            onSubmit={(values: SavePresetFormValues) => {
              onSave(values.title ?? "", promptToSave);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Preset name" placeholder="e.g. Ticket description" />
    </Form>
  );
}

export type ReplyFormValues = { reply: string };

export function ReplyForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send"
            icon={Icon.ArrowRight}
            onSubmit={(values: ReplyFormValues) => {
              onSubmit(values.reply ?? "");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="reply" title="Follow-up" placeholder="Ask a follow-up question…" />
    </Form>
  );
}

type SessionModelFormValues = { model: string };

export function SessionModelForm({
  initialModel,
  onSubmit,
}: {
  initialModel: string;
  onSubmit: (model: string) => void;
}) {
  return (
    <Form
      key={initialModel}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply"
            icon={Icon.Check}
            onSubmit={(values: SessionModelFormValues) => {
              onSubmit(values.model ?? initialModel);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="model" title="Model for this chat" defaultValue={initialModel}>
        {MODEL_PREFERENCE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
