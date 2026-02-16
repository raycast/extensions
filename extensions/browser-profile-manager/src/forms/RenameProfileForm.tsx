import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { setProfileAlias } from "../storage";
import { ResolvedBrowserProfile } from "../types";

interface RenameProfileFormValues {
  alias: string;
}

interface RenameProfileFormProps {
  profile: ResolvedBrowserProfile;
  onSaved: () => Promise<void>;
}

export function RenameProfileForm({
  profile,
  onSaved,
}: RenameProfileFormProps) {
  const { pop } = useNavigation();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(values: RenameProfileFormValues) {
    const alias = values.alias.trim();
    if (!alias) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Alias Can't Be Empty",
      });
      return;
    }

    setIsSaving(true);

    try {
      await setProfileAlias(profile.id, alias);
      await onSaved();
      await showToast({
        style: Toast.Style.Success,
        title: "Profile Renamed",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't Rename Profile",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Alias" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Profile"
        text={`${profile.originalName} (${profile.browser})`}
      />
      <Form.TextField
        id="alias"
        title="Alias"
        placeholder="Enter a custom name for the profile"
        defaultValue={profile.alias ?? ""}
      />
    </Form>
  );
}
