import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { normalizeGroup } from "../lib/groups";

export function GroupForm(props: {
  submitTitle: string;
  defaultValue?: string;
  validate?: (group: string) => string | undefined;
  onSubmit: (group: string) => void;
}) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.submitTitle}
            onSubmit={(values: { group: string }) => {
              const group = normalizeGroup(values.group);
              const validationError = group ? props.validate?.(group) : "Enter a group name";
              if (validationError) {
                setError(validationError);
                return;
              }
              props.onSubmit(group);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="group"
        title="Group"
        defaultValue={props.defaultValue}
        placeholder="Calendar or Work/Calendar"
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}
