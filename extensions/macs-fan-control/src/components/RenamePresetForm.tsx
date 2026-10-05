import { useState } from "react";
import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { CustomPreset, MfcError, renamePreset } from "../lib/mfc";

export default function RenamePresetForm(props: { preset: CustomPreset; onRenamed: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(props.preset.name);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the preset a name");
    if (trimmed.includes("|")) return setError("Names cannot contain “|”");
    if (trimmed === props.preset.name) return pop();

    setSaving(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Renaming…" });
    try {
      await renamePreset(props.preset, trimmed);
      toast.style = Toast.Style.Success;
      toast.title = `Renamed to “${trimmed}”`;
      props.onRenamed();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not rename";
      toast.message = e instanceof MfcError ? e.message : String(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Preset" icon={Icon.Pencil} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Preset Name"
        value={name}
        error={error}
        onChange={(v) => {
          setName(v);
          setError(undefined);
        }}
      />
      <Form.Description title="Note" text="Renaming restarts Macs Fan Control so it picks up the change." />
    </Form>
  );
}
