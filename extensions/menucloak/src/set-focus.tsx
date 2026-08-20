import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { runMenuCloakAction } from "./menucloak";

interface Values {
  focus: string;
}

export default function Command() {
  async function handleSubmit(values: Values) {
    const query = encodeURIComponent(values.focus.trim());
    await runMenuCloakAction(`set?text=${query}`, "Focus updated");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Focus" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="focus" title="Focus" placeholder="What deserves your attention?" autoFocus />
    </Form>
  );
}
