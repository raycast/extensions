import { Action, ActionPanel, Form } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

const slugRegex = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

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
      name: (value) => {
        if (!value) {
          return "Please enter an alias name";
        }
        if (!slugRegex.test(value)) {
          return "Alias name must be a valid slug";
        }
      },
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
