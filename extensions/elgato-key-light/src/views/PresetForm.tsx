import { Form, ActionPanel, Action, showToast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { Preset } from "../presets";
import { rangeValidator } from "../utils";
import emoji from "emojilib";

export type FormValues = {
  name: string;
  icon?: string;
  brightness: string;
  temperature: string;
};

export default function PresetForm(props: {
  onSave: (values: FormValues & { id?: string }) => Promise<void>;
  preset?: Preset;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      name: props.preset?.name ?? "",
      icon: props.preset?.icon,
      brightness: props.preset?.settings.brightness?.toString() ?? "20",
      temperature: props.preset?.settings.temperature?.toString() ?? "25",
    },
    onSubmit: async (values) => {
      try {
        await props.onSave({ ...values, id: props.preset?.id });
        await showToast({ title: props.preset ? "Updated preset" : "Saved preset" });
        pop();
      } catch (error) {
        await showFailureToast(error, { title: props.preset ? "Failed updating preset" : "Failed saving preset" });
      }
    },
    validation: {
      name: FormValidation.Required,
      brightness: rangeValidator(0, 100),
      temperature: rangeValidator(0, 100),
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Icon" placeholder="Select an icon" {...itemProps.icon}>
        {Object.entries(emoji).map(([key, value]) => (
          <Form.Dropdown.Item key={key} value={key} icon={key} title={getEmojiTitle(value[0])} keywords={value} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Name" placeholder="Name of the preset" {...itemProps.name} />
      <Form.TextField title="Brightness (%)" placeholder="Brightness of the preset" {...itemProps.brightness} />
      <Form.TextField title="Temperature (%)" placeholder="Temperature of the preset" {...itemProps.temperature} />
    </Form>
  );
}

function getEmojiTitle(emoji: string) {
  return emoji
    .split(/[_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
