import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";

import { makeProfileId, setDefaultProfile, sortProfiles, upsertProfile } from "./profileUtils";
import type { ProfileEditorProps, ProfileFormValues } from "./types";

export function ProfileEditor({ profile, initialName, profiles, setProfiles }: ProfileEditorProps) {
  const isEditing = Boolean(profile);
  const defaultValue = profile?.isDefault ?? profiles.length === 0;

  async function handleSubmit(values: ProfileFormValues) {
    const name = values.name.trim();
    const browserApp = values.browserApp.trim();
    const profileDirectory = values.profileDirectory.trim();

    if (!name || !browserApp || !profileDirectory) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing profile details",
        message: "Fill in the profile name, browser app, and profile directory.",
      });
      return;
    }

    const nextProfile = {
      id: profile?.id ?? makeProfileId(),
      name,
      browserApp,
      profileDirectory,
      isDefault: values.isDefault,
    };

    let nextProfiles = sortProfiles(upsertProfile(profiles, nextProfile));

    if (nextProfile.isDefault) {
      nextProfiles = setDefaultProfile(nextProfiles, nextProfile.id);
    }

    await setProfiles(nextProfiles);
    await showToast({
      style: Toast.Style.Success,
      title: isEditing ? "Profile updated" : "Profile saved",
      message: `${name} is ready to use.`,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Save Profile" : "Add Profile"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a browser app name and the profile directory or profile name it uses. For Chrome and Edge, this is usually something like Default or Profile 1." />
      <Form.TextField
        id="name"
        title="Profile Name"
        defaultValue={profile?.name ?? initialName ?? "Work"}
        placeholder="Work"
      />
      <Form.TextField
        id="browserApp"
        title="Browser App"
        defaultValue={profile?.browserApp ?? "Google Chrome"}
        placeholder="Google Chrome"
      />
      <Form.TextField
        id="profileDirectory"
        title="Profile Directory"
        defaultValue={profile?.profileDirectory ?? "Profile 1"}
        placeholder="Profile 1"
      />
      <Form.Checkbox
        id="isDefault"
        title="Default Profile"
        label="Use this profile as the default selection"
        defaultValue={defaultValue}
      />
    </Form>
  );
}
