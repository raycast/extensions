import { useNavigation, Form, ActionPanel, Action, Icon } from "@raycast/api";

/**
 * Props for the SetSpeedForm component
 */
interface SetSpeedFormProps {
  /** Name of the device to set speed for */
  deviceName: string;
  /** Callback function called when form is submitted with speed level */
  onSubmit: (values: { speedLevel: string }) => void;
}

/**
 * Form component for setting the speed level of an Atomberg device
 * Provides a dropdown selection for speed levels 1-6 with appropriate icons
 */
export function SetSpeedForm({ deviceName, onSubmit }: SetSpeedFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={`Set Speed Level - ${deviceName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Speed"
            icon={Icon.Gauge}
            onSubmit={(values) => {
              onSubmit(values as { speedLevel: string });
              pop();
            }}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="speedLevel" title="Speed Level" placeholder="Select speed level">
        <Form.Dropdown.Item value="1" title="Level 1 (Lowest)" icon={Icon.Gauge} />
        <Form.Dropdown.Item value="2" title="Level 2" icon={Icon.Gauge} />
        <Form.Dropdown.Item value="3" title="Level 3" icon={Icon.Gauge} />
        <Form.Dropdown.Item value="4" title="Level 4" icon={Icon.Gauge} />
        <Form.Dropdown.Item value="5" title="Level 5" icon={Icon.Gauge} />
        <Form.Dropdown.Item value="6" title="Level 6 (Highest)" icon={Icon.Gauge} />
      </Form.Dropdown>
    </Form>
  );
}
