import { useCallback } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";

function CreateEventForm(props: { onCreate: (eventName: string, eventData: string | null) => void }) {
  const { onCreate } = props;
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { eventName: string; eventData: string | null }) => {
      onCreate(values.eventName, values.eventData);
      pop();
    },
    [onCreate, pop]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Event" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="eventName" title="Event Name" />
      <Form.TextArea id="eventData" title="Event Data" />
    </Form>
  );
}

export default CreateEventForm;
