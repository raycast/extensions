import { useRef } from "react";
import { Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { ModifyCommand } from "../../hooks";

type FormValues = {
  value: string;
};

export const NewTag = ({ command }: { command: ModifyCommand }) => {
  const { pop } = useNavigation();
  const textRef = useRef<Form.TextField>(null);

  const handleSubmit = (values: FormValues) => {
    command(`+${values.value}`).then(pop);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} icon={Icon.PlusCircle} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="💡"
        text="Tags are simply one-word alphanumeric labels, and a task may have any number of them"
      />
      <Form.TextField ref={textRef} id="value" title="New Tag" />
    </Form>
  );
};
