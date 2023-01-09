import { useCallback } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";

function SelectChannelForm(props: { defaultChannel?: string; onCreate: (title: string) => void }) {
  const { onCreate, defaultChannel = "" } = props;
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { title: string }) => {
      onCreate(values.title);
      pop();
    },
    [onCreate, pop]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Select Channel" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" defaultValue={defaultChannel} title="Channel" />
    </Form>
  );
}

export default SelectChannelForm;
