import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { importProfiles } from "../lib/profiles";

interface Props {
  onImported?: () => void;
}

export default function ImportForm({ onImported }: Props) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { json: string; mode: string }) {
    try {
      const count = await importProfiles(values.json, values.mode === "replace" ? "replace" : "merge");
      await showToast({ style: Toast.Style.Success, title: `Imported ${count} ritual${count === 1 ? "" : "s"}` });
      onImported?.();
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Import failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <Form
      navigationTitle="Import Rituals"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Mode" defaultValue="merge">
        <Form.Dropdown.Item value="merge" title="Merge (keep existing)" icon={Icon.Plus} />
        <Form.Dropdown.Item value="replace" title="Replace all" icon={Icon.ExclamationMark} />
      </Form.Dropdown>
      <Form.TextArea id="json" title="JSON" placeholder='[{ "name": "Work", "apps": ["Slack"], ... }]' />
    </Form>
  );
}
