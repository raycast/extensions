import { Action, ActionPanel, Form } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

export interface CreateAliasFormValues {
  name: string;
  command: string;
}

export default function FormAlias({
  isLoading,
  onSubmit,
  initialValues,
}: {
  isLoading?: boolean;
  onSubmit: (values: CreateAliasFormValues) => Promise<void>;
  initialValues?: CreateAliasFormValues;
}) {
  const { handleSubmit, itemProps } = useForm<CreateAliasFormValues>({
    onSubmit,
    validation: {
      name: FormValidation.Required,
      command: FormValidation.Required,
    },
    initialValues,
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Alias" placeholder="my-alias" {...itemProps.name} />
      <Form.TextField title="Command" placeholder="ls -al" {...itemProps.command} />
    </Form>
  );
}
