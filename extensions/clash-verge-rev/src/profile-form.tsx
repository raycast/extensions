import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  ProfileItem,
  updateProfileMetadata,
  getShortcut,
  saveShortcut,
  isShortcutDuplicate,
} from "./utils/profiles";

interface ProfileFormProps {
  profile: ProfileItem;
  onRefresh: () => void;
}

interface FormValues {
  name: string;
  desc: string;
  shortcut: string;
  url: string;
  interval: string;
}

export default function ProfileForm({ profile, onRefresh }: ProfileFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [currentShortcut, setCurrentShortcut] = useState<string>(
    getShortcut(profile.uid) || "",
  );

  async function handleSubmit(values: FormValues) {
    if (!values.name) {
      setNameError("Name is required");
      return;
    }

    const shortcut = values.shortcut?.trim();

    if (shortcut) {
      const duplicateUid = isShortcutDuplicate(shortcut, profile.uid);
      if (duplicateUid) {
        showToast({
          style: Toast.Style.Failure,
          title: "Duplicate Shortcut",
          message: `Shortcut "${shortcut}" is already used by another profile`,
        });
        return;
      }
    }

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Updating profile...",
      });

      const interval = parseInt(values.interval, 10) || 0;

      // Update metadata (slow operation)
      updateProfileMetadata(profile.uid, {
        name: values.name,
        desc: values.desc,
        url: values.url,
        option: {
          ...profile.option,
          update_interval: interval,
        },
      });

      // Update shortcut (fast operation)
      saveShortcut(profile.uid, shortcut);

      showToast({
        style: Toast.Style.Success,
        title: "Profile updated",
      });

      onRefresh();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update profile",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Profile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Profile Name"
        defaultValue={profile.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="desc"
        title="Description"
        placeholder="Optional description"
        defaultValue={profile.desc}
      />
      <Form.TextField
        id="shortcut"
        title="Shortcut"
        placeholder="Unique shortcut (e.g., 'ssr')"
        defaultValue={currentShortcut}
        info="Unique shortcut to quickly switch to this profile via command argument."
      />
      {profile.type === "remote" && (
        <>
          <Form.TextArea
            id="url"
            title="Subscription URL"
            placeholder="https://example.com/subscribe"
            defaultValue={profile.url}
          />
          <Form.TextField
            id="interval"
            title="Update Interval (Minutes)"
            placeholder="0 to disable auto-update"
            defaultValue={
              profile.option?.update_interval
                ? String(profile.option.update_interval)
                : ""
            }
            info="Automatic update interval in minutes. Set to 0 to disable."
          />
        </>
      )}
    </Form>
  );
}
