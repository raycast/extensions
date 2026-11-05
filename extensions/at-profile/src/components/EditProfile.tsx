import { showError } from "@chrismessina/raycast-kit";
import { useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { renameHistoryProfile } from "../helpers/history";
import { cleanProfile } from "../helpers/url";

interface EditProfileFormProps {
  originalProfile: string;
  app: string;
  appName: string;
}

export function EditProfileForm({ originalProfile, app, appName }: EditProfileFormProps) {
  const { pop } = useNavigation();
  const [profile, setProfile] = useState(originalProfile);

  const handleSubmit = async () => {
    const newProfile = cleanProfile(profile);
    if (!newProfile) {
      await showError("Enter a profile name.", { title: "Profile Can't Be Empty" });
      return;
    }
    if (newProfile === originalProfile) {
      pop();
      return;
    }

    try {
      await renameHistoryProfile(originalProfile, app, newProfile);
      await showToast({ style: Toast.Style.Success, title: "Profile Updated", message: `@${newProfile}` });
      pop();
    } catch (error) {
      await showError(error, { title: "Couldn't Update Profile" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Profile" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={pop} />
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
