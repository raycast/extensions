import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { chatDefaults, saveChatDefaults } from "../lib/ai-models";
import { chatShape } from "../lib/chat";
import { modelId } from "../lib/replicate";
import { Model } from "../types";
import { modelFields } from "../utils/schema";
import { ModelField } from "./ModelField";
import { buildInput, FormValues } from "./ModelForm";

const asText = (value: unknown) => (value === undefined || value === null ? undefined : String(value));

type Props = {
  model: Model;
  onSave?: () => void;
};
export const ChatDefaultsForm = ({ model, onSave }: Props) => {
  const { pop } = useNavigation();
  const id = modelId(model);
  const { data: saved, isLoading } = usePromise(chatDefaults, [id]);
  const shape = chatShape(model);
  // The chat supplies the prompt and image, and an uploaded file would expire.
  const fields = modelFields(model).filter(
    (field) => field.kind !== "file" && field.name !== shape?.prompt && field.name !== shape?.image?.name,
  );

  const save = async (inputs: Record<string, unknown>) => {
    await saveChatDefaults(id, inputs);
    onSave?.();
    const count = Object.keys(inputs).length;
    await showToast({
      style: Toast.Style.Success,
      title: count ? "Chat Defaults Saved" : "Using the Model's Defaults",
      message: count ? `${count} input${count === 1 ? "" : "s"} set for ${id}` : id,
    });
    pop();
  };

  const handleSubmit = async (values: FormValues) => {
    const input = await buildInput(fields, values);
    // Keeping only changed inputs lets the model's own defaults apply if it updates them.
    const changed = Object.entries(input).filter(
      ([name, value]) => String(value) !== String(fields.find((field) => field.name === name)?.schema.default ?? ""),
    );
    await save(Object.fromEntries(changed));
  };

  if (isLoading) return <Form isLoading navigationTitle={id} />;

  return (
    <Form
      navigationTitle={id}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save Chat Defaults" onSubmit={handleSubmit} />
          <Action icon={Icon.ArrowCounterClockwise} title="Reset to Model Defaults" onAction={() => save({})} />
        </ActionPanel>
      }
    >
      <Form.Description text="Used every time you chat with this model. The chat still supplies the prompt and any image." />
      {fields.map((field) => (
        <ModelField key={field.name} field={field} defaultValue={asText(saved?.[field.name])} />
      ))}
      {!fields.length && <Form.Description text="This model has no other inputs to set." />}
    </Form>
  );
};
