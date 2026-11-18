import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

export default function CustomVolumeForm({
  initial,
  onSubmit,
}: {
  initial: number;
  onSubmit: (value: number) => Promise<void>;
}) {
  const { handleSubmit, itemProps } = useForm<{ volume: string }>({
    onSubmit: ({ volume }) => onSubmit(Number(volume)),
    initialValues: { volume: String(initial) },
    validation: {
      volume: (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return FormValidation.Required;
        if (n < 0 || n > 100) return "Volume must be between 0 and 100";
      },
    },
  });

  return (
    <Form
      navigationTitle="Set Custom Volume"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Volume" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Volume (0–100)" placeholder="50" {...itemProps.volume} />
    </Form>
  );
}
