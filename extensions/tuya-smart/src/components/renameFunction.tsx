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
  const currentName = props.command.name ?? props.command.code;
  const [name, setName] = useState<string>(currentName);

  const onSubmit = ({ name: submitted }: { name: string }) => {
    const trimmed = submitted.trim();
    props.onAction({ result: true, command: { ...props.command, name: trimmed || currentName } });
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
      <Form.TextField id="name" title="Name" placeholder={currentName} value={name} onChange={setName} />
    </Form>
  );
}
