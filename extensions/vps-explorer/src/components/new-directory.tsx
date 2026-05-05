import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface NewDirectoryFormValues {
  name: string;
}

export default function NewDirectory({ onSubmit }: { onSubmit: (name: string) => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<NewDirectoryFormValues>({
    onSubmit(values) {
      onSubmit(values.name);
      setTimeout(() => {
        pop();
      }, 1000);
    },
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
      <Form.TextField title="Directory Name" placeholder="New Directory" {...itemProps.name} />
    </Form>
  );
}
