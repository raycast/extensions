import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { showErrorToast } from "../lib/error-toast";
import { createMonitor, MONITOR_KINDS, MonitorKind } from "../lib/monitors";

type CreateMonitorFormProps = {
  kind: MonitorKind;
  target?: string;
  onCreated?: () => void;
};

type CreateMonitorValues = {
  target: string;
  name: string;
  eventTypes: string[];
};

export function CreateMonitorForm({ kind, target = "", onCreated }: CreateMonitorFormProps) {
  const { pop } = useNavigation();
  const { eventLabels, targetPlaceholder, targetTitle } = MONITOR_KINDS[kind];

  async function create(values: CreateMonitorValues) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating Monitor" });
    try {
      const { eventTypes, name } = values;
      await createMonitor(kind, { target: values.target.trim(), name: name.trim() || undefined, eventTypes });
      toast.style = Toast.Style.Success;
      toast.title = "Monitor Created";
      onCreated?.();
      pop();
    } catch (error) {
      await toast.hide();
      await showErrorToast(error as Error, () => create(values));
    }
  }

  const { handleSubmit, itemProps } = useForm<CreateMonitorValues>({
    initialValues: { target, name: "", eventTypes: ["tweet.new"] },
    validation: {
      target: FormValidation.Required,
      eventTypes: (value) => (value?.length ? undefined : "Pick at least 1 event."),
    },
    onSubmit: create,
  });

  return (
    <Form
      navigationTitle="Create Monitor"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Monitor" icon={Icon.Bell} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Each active monitor costs 30 credits an hour." />
      <Form.TextField title={targetTitle} placeholder={targetPlaceholder} {...itemProps.target} />
      <Form.TextField title="Name" placeholder="Optional Label" {...itemProps.name} />
      <Form.TagPicker title="Events" {...itemProps.eventTypes}>
        {Object.entries(eventLabels).map(([type, label]) => (
          <Form.TagPicker.Item key={type} value={type} title={label} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
