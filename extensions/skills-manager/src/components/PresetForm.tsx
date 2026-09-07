import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { createPreset, updatePreset } from "../lib/api";
import { useCliAction } from "../hooks/useCliAction";
import { Preset } from "../lib/types";

/** Creates a preset, or renames an existing one when `preset` is given. */
export function PresetForm({ preset, onDone }: { preset?: Preset; onDone: () => void }) {
  const runAction = useCliAction();
  const { pop } = useNavigation();
  const editing = Boolean(preset);

  async function submit(values: { name: string; description: string }) {
    const name = values.name.trim();
    if (!name) return;

    await runAction({
      pending: editing ? `Updating ${preset?.name}…` : `Creating ${name}…`,
      run: () =>
        editing && preset
          ? updatePreset(preset.id, { name, description: values.description })
          : createPreset(name, values.description.trim() || undefined),
      success: () => ({ title: editing ? `Updated ${name}` : `Created ${name}` }),
      failureTitle: editing ? "Could not update preset" : "Could not create preset",
      onSuccess: () => {
        onDone();
        pop();
      },
    });
  }

  return (
    <Form
      navigationTitle={editing ? `Rename ${preset?.name}` : "New Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={editing ? "Save Changes" : "Create Preset"}
            icon={editing ? Icon.Pencil : Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Web Dev" defaultValue={preset?.name ?? ""} />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Frontend work"
        defaultValue={preset?.description ?? ""}
      />
      <Form.Description
        title="Note"
        text="Creating or renaming a preset changes nothing in your agents. Deploy it afterwards to make its skills visible."
      />
    </Form>
  );
}
