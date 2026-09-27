import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { ClaudeProfile, registry } from "../lib/profiles";

interface FormValues {
  name: string;
}

interface Props {
  profile: ClaudeProfile;
  onRenamed: () => void;
}

export default function RenameProfile({ profile, onRenamed }: Props) {
  const [nameError, setNameError] = useState<string | undefined>();
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    if (!values.name.trim()) {
      setNameError("Required");
      return;
    }

    try {
      const renamed = await registry.rename(profile.id, values.name);
      await showToast({
        style: Toast.Style.Success,
        title: `Renamed to "${renamed.name}"`,
      });
      onRenamed();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't rename profile" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Profile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Profile Name"
        placeholder="Work, Personal, Client A…"
        defaultValue={profile.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
        autoFocus
      />
    </Form>
  );
}
