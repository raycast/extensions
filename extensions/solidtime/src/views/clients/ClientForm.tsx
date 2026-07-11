import { Action, ActionPanel, Form } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

type ClientFormType = {
  name: string;
};
export function ClientForm(props: { initialValues?: ClientFormType; onSubmit: (values: ClientFormType) => void }) {
  const { handleSubmit, itemProps } = useForm<ClientFormType>({
    onSubmit: props.onSubmit,
    initialValues: props.initialValues,
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Name of the client" {...itemProps.name} />
    </Form>
  );
}
