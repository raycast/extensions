import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Profile } from "./lib/types";
import { loadProfiles, upsertProfile, newId } from "./lib/storage";
import {
  commitProfiles,
  parseEntries,
  ProfilesRollbackError,
  serializeEntries,
} from "./lib/hosts";

interface FormValues {
  name: string;
  entries: string;
}

export default function EditProfile(props: {
  profile?: Profile;
  onDone?: () => void;
}) {
  const { profile, onDone } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(values) {
      const entries = parseEntries(values.entries);
      const next: Profile = profile
        ? { ...profile, name: values.name.trim(), entries }
        : { id: newId(), name: values.name.trim(), enabled: true, entries };

      const previous = loadProfiles();
      const all = upsertProfile(previous, next);
      try {
        commitProfiles(previous, all);
      } catch (error) {
        const rollbackFailed = error instanceof ProfilesRollbackError;
        void showToast({
          style: Toast.Style.Failure,
          title: rollbackFailed
            ? "Profile and Hosts File Out of Sync"
            : "Failed to Update Hosts File",
          message: rollbackFailed
            ? "The profile was saved, but the hosts file was not updated and rollback failed. Retry saving to synchronize them."
            : "Elevation was declined or the write failed. The profile was not saved.",
        });
        return;
      }
      void showToast({
        style: Toast.Style.Success,
        title: profile ? "Profile Updated" : "Profile Created",
        message: next.name,
      });
      onDone?.();
      pop();
    },
    initialValues: {
      name: profile?.name ?? "",
      entries: profile ? serializeEntries(profile.entries) : "",
    },
    validation: {
      name: (value) =>
        value && value.trim().length > 0
          ? undefined
          : "Profile name is required",
      entries: (value) => {
        const entries = parseEntries(value ?? "");
        return entries.length > 0
          ? undefined
          : "At least one valid IP hostname mapping is required";
      },
    },
  });

  return (
    <Form
      navigationTitle={
        profile ? `Edit Profile · ${profile.name}` : "New Profile"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Profile Name"
        placeholder="e.g. Development / Staging"
        {...itemProps.name}
      />
      <Form.TextArea
        title="Host Mappings"
        placeholder={
          "One mapping per line: IP hostname [# comment]\nExample:\n127.0.0.1 api.local # local API"
        }
        info="One mapping per line, separated by spaces between IP and hostname. Optional # for a comment."
        enableMarkdown={false}
        {...itemProps.entries}
      />
    </Form>
  );
}
