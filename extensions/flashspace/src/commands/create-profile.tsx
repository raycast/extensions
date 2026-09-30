import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { getErrorMessage, runFlashspaceAsync } from "../utils/cli";

interface CreateProfileValues {
  name: string;
  copy: boolean;
  activate: boolean;
}

export default function CreateProfile() {
  const { pop } = useNavigation();

  async function handleSubmit(values: CreateProfileValues) {
    if (!values.name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }

    const args = ["create-profile", values.name];

    if (values.copy) {
      args.push("--copy");
    }
    if (values.activate) {
      args.push("--activate");
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating profile..." });

    try {
      await runFlashspaceAsync(args);
      toast.style = Toast.Style.Success;
      toast.title = `Profile "${values.name}" created`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create profile";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Profile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter profile name" />
      <Form.Checkbox id="copy" label="Copy current profile" defaultValue={false} />
      <Form.Checkbox id="activate" label="Activate after creation" defaultValue={false} />
    </Form>
  );
}
