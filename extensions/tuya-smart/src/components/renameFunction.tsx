import { ActionPanel, Form, Action, useNavigation } from "@raycast/api";
import { useState } from "react";
import { FunctionItem } from "../utils/interfaces";

interface Props {
  deviceId: string;
  command: FunctionItem;
  onAction: (props: { result: boolean; command: FunctionItem }) => void;
}

export default function RenameFunctionForm(props: Props) {
  const { pop } = useNavigation();
  const [name, setName] = useState<string>("");

  const onSubmit = async ({ name }: { name: string }) => {
    props.onAction({ result: true, command: { ...props.command, name } });
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Name" onSubmit={(values: { name: string }) => onSubmit(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
    </Form>
  );
}
