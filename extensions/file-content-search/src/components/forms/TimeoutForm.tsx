import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import type { FC } from "react";
import { TIMEOUT_OPTIONS } from "../../constants";

type TimeoutFormProps = {
  timeout: number;
  onAction: (timeout: number) => void;
};

export const TimeoutForm: FC<TimeoutFormProps> = ({ timeout, onAction }) => {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Timeout"
            onSubmit={(values: { timeout: string }) => {
              onAction(parseInt(values.timeout, 10));
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="timeout" title="Search Timeout" defaultValue={timeout.toString()}>
        {TIMEOUT_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Description text="Set how long the search should run before timing out." />
    </Form>
  );
};
