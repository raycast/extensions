import { Form, ActionPanel, Action, popToRoot } from "@raycast/api";
import { useState } from "react";
import { updateUsageHistoryItem } from "../helpers/apps";
import { showError, showSuccess, withErrorHandling } from "../utils/errors";

interface EditProfileFormProps {
  originalProfile: string;
  app: string;
  appName: string;
  onUpdate: () => void;
}

export function EditProfileForm({ originalProfile, app, appName, onUpdate }: EditProfileFormProps) {
  const [profile, setProfile] = useState(originalProfile);

  const handleSubmit = async () => {
    if (!profile.trim()) {
      await showError("Profile cannot be empty", "Error");
      return;
    }

    const cleanProfile = profile.trim();
    if (cleanProfile === originalProfile) {
      await popToRoot();
      return;
    }

    await withErrorHandling(
      async () => {
        await updateUsageHistoryItem(originalProfile, app, cleanProfile);
        await showSuccess("Updated", `Profile updated to @${cleanProfile}`);
        onUpdate();
        await popToRoot();
      },
      "updating profile",
      true,
      "Error",
    )();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Profile" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={() => popToRoot()} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="profile"
        title="Profile"
        placeholder="Enter profile name"
        value={profile}
        onChange={setProfile}
        info={`Edit Profile on ${appName}`}
      />
    </Form>
  );
}
