import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { errorMessage, runContainerMutation } from "../lib/container";
import { withToast } from "../lib/toast";

interface FormValues {
  target: string;
}

export function TagImageForm({ source, onTagged }: { source: string; onTagged?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: (values) => {
      const target = values.target.trim();
      void withToast({
        action: () => runContainerMutation(["image", "tag", source, target]),
        onStart: { title: "Tagging image…", message: `${source} → ${target}` },
        onSuccess: { title: "Image tagged", message: target },
        onFailure: (error) => ({ title: "Tag failed", message: errorMessage(error) }),
      })().then(() => onTagged?.());
      pop();
    },
    validation: { target: FormValidation.Required },
  });

  return (
    <Form
      navigationTitle={`Tag ${source}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Tag Image" icon={Icon.Tag} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Apply a new tag to ${source}.`} />
      <Form.TextField title="New Reference" placeholder="myapp:latest" {...itemProps.target} />
    </Form>
  );
}
