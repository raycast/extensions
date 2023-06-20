import { useRef } from "react";
import { Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { ModifyCommand } from "../../hooks";

type FormValues = {
  value: string;
};

export const NewProject = ({ command }: { command: ModifyCommand }) => {
  const { pop } = useNavigation();
  const textRef = useRef<Form.TextField>(null);

  const handleSubmit = (values: FormValues) => {
    command("project", values.value).then(pop);
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
        text="A single project may be assigned to a task, and that project may be multiple words"
      />
      <Form.TextField ref={textRef} id="value" title="New Project" />
    </Form>
  );
};
