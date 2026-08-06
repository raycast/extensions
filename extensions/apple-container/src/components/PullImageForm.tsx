import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { PULL_TIMEOUT_MS } from "../lib/constants";
import { errorMessage, runContainerMutation } from "../lib/container";
import { withToast } from "../lib/toast";

interface FormValues {
  reference: string;
}

export function PullImageForm({ onPulled }: { onPulled?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: (values) => {
      const reference = values.reference.trim();
      void withToast({
        action: () => runContainerMutation(["image", "pull", reference], { timeout: PULL_TIMEOUT_MS }),
        onStart: { title: "Pulling image…", message: reference },
        onSuccess: { title: "Image pulled", message: reference },
        onFailure: (error) => ({ title: "Pull failed", message: errorMessage(error) }),
      })().then(() => onPulled?.());
      pop();
    },
    validation: { reference: FormValidation.Required },
  });

  return (
    <Form
      navigationTitle="Pull Image"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Pull Image" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Reference" placeholder="nginx:latest" {...itemProps.reference} />
      <Form.Description text="Pull an image from a registry, e.g. nginx:latest, alpine, or ghcr.io/owner/image:tag." />
    </Form>
  );
}
