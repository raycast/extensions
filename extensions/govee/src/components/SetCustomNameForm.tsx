import { useState } from "react";

import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";

export type SetCustomNameFormProps = {
  deviceId: string;
  deviceName: string;
  currentName: string | null;
  setName: (deviceId: string, name: string | null) => void;
};

const SetCustomNameForm = ({ deviceId, deviceName, currentName, setName }: SetCustomNameFormProps) => {
  const { pop } = useNavigation();
  const [localName, setLocalName] = useState<string | null>(currentName);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={(input) => {
              const name = input.name.trim();
              if (name !== currentName) {
                setName(deviceId, name);
              }
              pop();
            }}
          />
          <Action
            title="Clear"
            onAction={() => {
              setName(deviceId, null);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={deviceId} title="Device ID" />
      <Form.Description text={deviceName} title="Device Name" />
      <Form.TextField
        id="name"
        title="Custom Name"
        defaultValue={localName ?? ""}
        placeholder="Enter a custom name"
        onChange={(value) => setLocalName(value)}
      />
    </Form>
  );
};

export default SetCustomNameForm;
