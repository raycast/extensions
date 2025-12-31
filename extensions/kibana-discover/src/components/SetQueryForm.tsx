import { Form, ActionPanel, Action } from "@raycast/api";

interface SetQueryFormProps {
  dataViewId: string;
  dataViewName: string;
  currentQuery: string;
  onSubmit: (query: string) => void;
}

export function SetQueryForm(props: SetQueryFormProps) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Search Query"
            onSubmit={(values: { query: string }) => {
              props.onSubmit(values.query);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Set search query for: ${props.dataViewName}`} />
      <Form.TextArea
        id="query"
        title="Kuery Query"
        placeholder="e.g., fedac3b17afd4b2b9a80e3aa3007b848 and username"
        defaultValue={props.currentQuery}
      />
      <Form.Description text="Use Kibana Query Language (KQL) syntax. Leave empty to show all documents." />
    </Form>
  );
}
