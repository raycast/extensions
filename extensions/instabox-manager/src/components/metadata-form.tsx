import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { updateMachine } from "../services/machines";
import { Machine } from "../types";
import { showError } from "../utils/errors";
import { parseKeyValueLines, toKeyValueLines } from "../utils/format";
import { validateLabels } from "./create-machine-form";

interface MetadataFormProps {
  machine: Machine;
  onSaved: () => void;
}

export function MetadataForm({ machine, onSaved }: MetadataFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ labels: string }>({
    initialValues: { labels: toKeyValueLines(machine.metadata ?? {}) },
    validation: { labels: validateLabels },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving labels…" });
      try {
        await updateMachine(machine.id, { metadata: parseKeyValueLines(values.labels) });
        toast.style = Toast.Style.Success;
        toast.title = "Saved labels";
        onSaved();
        pop();
      } catch (error) {
        await showError(error, { toast, title: "Could not save the labels" });
      }
    },
  });

  return (
    <Form
      navigationTitle={`Labels for ${machine.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Labels" icon={Icon.Tag} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.labels}
        title="Labels"
        placeholder={"task=review\nowner=me"}
        info="key=value, one per line. Keys use letters, digits, '_', '.' and '-'. Leave empty to clear all labels."
      />
    </Form>
  );
}
