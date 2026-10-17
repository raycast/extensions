import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { errorMessage, runContainerMutation } from "../lib/container";
import { withToast } from "../lib/toast";

interface FormValues {
  name: string;
}

export function CreateVolumeForm({ onCreated }: { onCreated?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: (values) => {
      const name = values.name.trim();
      void withToast({
        action: () => runContainerMutation(["volume", "create", name]),
        onStart: { title: "Creating volume…", message: name },
        onSuccess: { title: "Volume created", message: name },
        onFailure: (error) => ({ title: "Create failed", message: errorMessage(error) }),
      })().then(() => onCreated?.());
      pop();
    },
    validation: { name: FormValidation.Required },
  });

  return (
    <Form
      navigationTitle="Create Volume"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Volume" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="my-volume" {...itemProps.name} />
      <Form.Description text="Create a named volume to persist data across containers." />
    </Form>
  );
}
