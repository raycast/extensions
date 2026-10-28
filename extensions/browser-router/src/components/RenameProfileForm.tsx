import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { setProfileNickname } from "../utils/storage";
import { BrowserProfile } from "../types";

interface RenameProfileFormProps {
  profile: BrowserProfile;
  onRenamed: () => void;
}

export function RenameProfileForm({ profile, onRenamed }: RenameProfileFormProps) {
  const { pop } = useNavigation();
  const [nickname, setNickname] = useState(profile.displayName);

  async function handleSubmit() {
    await setProfileNickname(profile.id, nickname);
    await showToast({
      style: Toast.Style.Success,
      title: "Profile Display Name Updated",
      message: nickname || profile.displayName,
    });
    onRenamed();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Display Name" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Set a custom display nickname for "${profile.displayName}". Leave empty to reset to default.`}
      />
      <Form.TextField
        id="nickname"
        title="Custom Display Name"
        placeholder={`e.g. ${profile.browserName} — My Work`}
        value={nickname}
        onChange={setNickname}
      />
    </Form>
  );
}
