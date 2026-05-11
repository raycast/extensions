import { Action, ActionPanel, Form } from "@raycast/api";
import useComposerize from "./hooks/useComposerize";

export default function Command() {
  const { submit, command, setCommand } = useComposerize("decomposerize");

  return (
    <Form
      navigationTitle="Compose to Docker"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="command"
        title="Docker Compose YAML"
        placeholder={`services:
  web:
    image: nginx
    ports:
      - "80:80"
`}
        value={command}
        onChange={setCommand}
        autoFocus
      />
    </Form>
  );
}
