import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";

type Props = { label: string; onSubmit: (label: string) => Promise<void> };

export function RenameForm({ label, onSubmit }: Props) {
  const { pop } = useNavigation();
  const [value, setValue] = useState(label);

  return (
    <Form
      navigationTitle="Rename"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async () => {
              await onSubmit(value);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="label" title="Name" value={value} onChange={setValue} />
    </Form>
  );
}
