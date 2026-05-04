import { Action, ActionPanel, Form } from "@raycast/api";

interface PinFormProps {
  onPinSubmit: (pin: string) => void;
}

interface PinFormValues {
  pin: string;
}

export function PinForm({ onPinSubmit }: PinFormProps) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Unlock Vault"
            onSubmit={(values: PinFormValues) => onPinSubmit(values.pin)}
          />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="pin"
        title="Master Password"
        placeholder="Enter your Enpass master password"
      />
    </Form>
  );
}
