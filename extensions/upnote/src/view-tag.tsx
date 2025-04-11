import { Form, ActionPanel, Action } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { exec } from "child_process";
type Values = {
  tag: string;
};

export default function Command() {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit: (values) => {
      const cmd = `open 'upnote://x-callback-url/tag/view?tag=${values.tag}'`;
      exec(cmd);
    },
    validation: {
      tag: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Tag Title" placeholder="Enter text" {...itemProps.tag} />
    </Form>
  );
}
