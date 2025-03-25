import { useCallback } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { CreateEventValues } from "../types";

function CreateEventForm(props: { onCreate: (event: string, message: string | null) => void }) {
  const { onCreate } = props;
  const { pop } = useNavigation();

  const handleReturn = useCallback(
    (values: { event: string; message: string | null }) => {
      onCreate(values.event, values.message);
      pop();
    },
    [onCreate, pop]
  );

  const { handleSubmit, itemProps } = useForm<CreateEventValues>({
    onSubmit(values: any) {
      handleReturn({ event: values.event, message: values.message });
    },
    validation: {
      event: (value: string | undefined) => {
        if (!value) {
          return "Event name is required";
        }
        if (value && value.length > 200) {
          return "Event name must be less than 200 characters";
        }
      },
      message: (value: string | null | undefined) => {
        if (value && value.length > 10240) {
          return "Event data must be 10240 characters (10KB) max";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Event" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Event Name" {...itemProps.event} />
      <Form.TextArea title="Event Data" {...itemProps.message} />
    </Form>
  );
}

export default CreateEventForm;
