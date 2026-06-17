import { Action, ActionPanel, Form } from "@raycast/api";
import useComposerize from "./hooks/useComposerize";

export default function Command() {
  const { submit, command, setCommand } = useComposerize("composerize");

  return (
    <Form
      navigationTitle="Docker to Compose"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="command"
        title="Command"
        placeholder="docker run -d -p 80:80 nginx"
        value={command}
        onChange={setCommand}
        autoFocus
      />
    </Form>
  );
}
