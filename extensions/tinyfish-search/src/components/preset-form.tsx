import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { library } from "../library";
import type { ExtractionPreset } from "../library-store";

export function PresetForm({
  include,
  exclude,
  onSaved,
}: {
  include: string[];
  exclude: string[];
  onSaved: (preset: ExtractionPreset) => void;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: { name: "" },
    validation: {
      name: (value) =>
        !value?.trim() ? "Name your preset." : value.length > 100 ? "Use at most 100 characters." : undefined,
    },
    async onSubmit({ name }) {
      try {
        const preset = { id: randomUUID(), name: name.trim(), include, exclude };
        await library.savePreset(preset);
        onSaved(preset);
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Could not save preset" });
      }
    },
  });
  return (
    <Form
      navigationTitle="Save Extraction Preset"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preset" icon={Icon.Bookmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.Description title="Include" text={include.join("\n") || "Whole page"} />
      <Form.Description title="Exclude" text={exclude.join("\n") || "None"} />
    </Form>
  );
}
