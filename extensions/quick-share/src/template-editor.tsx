import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import { DEFAULT_MESSAGE_TEMPLATE, MESSAGE_TEMPLATE_KEY } from "./lib/template";

const PLACEHOLDERS_GUIDE =
  "Placeholders:\n" +
  "  {title}   - Page title (mrkdwn-escaped)\n" +
  "  {url}     - Raw URL\n" +
  "  {comment} - Your comment (mrkdwn-escaped)\n" +
  "  {link}    - <url|title> Slack short link\n" +
  "\n" +
  "Lines containing only an empty {comment} are removed.";

export default function TemplateEditor() {
  const { value, setValue, isLoading } = useLocalStorage<string>(MESSAGE_TEMPLATE_KEY, DEFAULT_MESSAGE_TEMPLATE);
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const { pop } = useNavigation();

  const current = draft ?? value ?? DEFAULT_MESSAGE_TEMPLATE;

  async function handleSubmit() {
    await setValue(current);
    pop();
  }

  function handleReset() {
    setDraft(DEFAULT_MESSAGE_TEMPLATE);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action title="Reset to Default" icon={Icon.ArrowCounterClockwise} onAction={handleReset} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="template" title="Template" value={current} onChange={setDraft} />
      <Form.Description title="Placeholders" text={PLACEHOLDERS_GUIDE} />
    </Form>
  );
}
