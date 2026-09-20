import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { addProfile, launchClaudeProfile } from "./lib/profiles";

interface FormValues {
  name: string;
  launchNow: boolean;
}

interface Props {
  onCreated?: () => void;
}

export default function CreateProfile({ onCreated }: Props) {
  const [nameError, setNameError] = useState<string | undefined>();
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    if (!values.name.trim()) {
      setNameError("Required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating profile…",
    });
    try {
      const profile = await addProfile(values.name);
      toast.style = Toast.Style.Success;
      toast.title = `Created "${profile.name}"`;

      if (values.launchNow) {
        await launchClaudeProfile(profile.dataDir);
      }

      onCreated?.();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't create profile";
      toast.message = error instanceof Error ? error.message : String(error);
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
      <Form.TextField
        id="name"
        title="Profile Name"
        placeholder="Work, Personal, Client A…"
        error={nameError}
        onChange={() => setNameError(undefined)}
        autoFocus
      />
      <Form.Description text="Creates an isolated login for Claude Desktop. Sign in fresh the first time you open it." />
      <Form.Checkbox
        id="launchNow"
        label="Open Claude with this profile now"
        defaultValue={true}
      />
    </Form>
  );
}
