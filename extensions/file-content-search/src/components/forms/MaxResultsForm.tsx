import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import type { FC } from "react";
import { MAX_RESULTS_OPTIONS } from "../../constants";

type MaxResultsFormProps = {
  maxResults: number;
  onAction: (maxResults: number) => void;
};

export const MaxResultsForm: FC<MaxResultsFormProps> = ({ maxResults, onAction }) => {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Max Results"
            onSubmit={(values: { maxResults: string }) => {
              onAction(parseInt(values.maxResults, 10));
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="maxResults" title="Maximum Results" defaultValue={maxResults.toString()}>
        {MAX_RESULTS_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Description text="Limit the number of search results displayed." />
    </Form>
  );
};
