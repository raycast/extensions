import { useNavigation, Form, ActionPanel, Action, Icon } from "@raycast/api";

/**
 * Props for the SetTimerForm component
 */
interface SetTimerFormProps {
  /** Name of the device to set timer for */
  deviceName: string;
  /** Callback function called when form is submitted with timer duration */
  onSubmit: (values: { timerHours: string }) => void;
}

/**
 * Form component for setting a custom timer on an Atomberg device
 * Provides a dropdown selection for timer durations from 1-4 hours with clock icons
 */
export function SetTimerForm({ deviceName, onSubmit }: SetTimerFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={`Set Custom Timer - ${deviceName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Timer"
            icon={Icon.Hourglass}
            onSubmit={(values) => {
              onSubmit(values as { timerHours: string });
              pop();
            }}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="timerHours" title="Timer Duration" placeholder="Select timer duration">
        <Form.Dropdown.Item value="1" title="1 Hour" icon={Icon.Clock} />
        <Form.Dropdown.Item value="2" title="2 Hours" icon={Icon.Clock} />
        <Form.Dropdown.Item value="3" title="3 Hours" icon={Icon.Clock} />
        <Form.Dropdown.Item value="4" title="4 Hours" icon={Icon.Clock} />
      </Form.Dropdown>
    </Form>
  );
}
