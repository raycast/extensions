import { Form, ActionPanel, Action, open } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { buildUpnoteUrl } from "./upnote-url";

type Values = {
  tag: string;
};

export default function Command() {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit: async (values) => {
      await open(buildUpnoteUrl("tag/view", { tag: values.tag }));
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
