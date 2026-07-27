import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { errorMessage, runContainerMutation } from "../lib/container";
import { withToast } from "../lib/toast";

interface FormValues {
  name: string;
  detach: boolean;
}

const RUN_TIMEOUT_MS = 120_000;

export function RunContainerForm({ image, onStarted }: { image: string; onStarted?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: (values) => {
      const args = ["run"];
      if (values.detach) {
        args.push("--detach");
      }
      const name = values.name.trim();
      if (name) {
        args.push("--name", name);
      }
      args.push(image);

      void withToast({
        action: () => runContainerMutation(args, { timeout: RUN_TIMEOUT_MS }),
        onStart: { title: "Starting container…", message: image },
        onSuccess: { title: "Container started", message: name || image },
        onFailure: (error) => ({ title: "Run failed", message: errorMessage(error) }),
      })().then(() => onStarted?.());
      pop();
    },
    initialValues: { name: "", detach: true },
  });

  return (
    <Form
      navigationTitle={`Run ${image}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Container" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Run a new container from ${image} using the image's default command.`} />
      <Form.TextField title="Name" placeholder="Optional container name" {...itemProps.name} />
      <Form.Checkbox label="Run in background (detached)" {...itemProps.detach} />
    </Form>
  );
}
