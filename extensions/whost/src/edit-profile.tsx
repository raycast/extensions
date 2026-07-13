import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Profile } from "./lib/types";
import { loadProfiles, saveProfiles, upsertProfile, newId } from "./lib/storage";
import { applyProfiles, parseEntries, serializeEntries } from "./lib/hosts";

interface FormValues {
  name: string;
  entries: string;
}

export default function EditProfile(props: { profile?: Profile; onDone?: () => void }) {
  const { profile, onDone } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(values) {
      const entries = parseEntries(values.entries);
      const next: Profile = profile
        ? { ...profile, name: values.name.trim(), entries }
        : { id: newId(), name: values.name.trim(), enabled: true, entries };

      const all = upsertProfile(loadProfiles(), next);
      saveProfiles(all);
      applyProfiles(all);
      showToast({
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
      name: (value) => (value && value.trim().length > 0 ? undefined : "Profile name is required"),
      entries: (value) => {
        const entries = parseEntries(value ?? "");
        return entries.length > 0 ? undefined : "At least one valid IP hostname mapping is required";
      },
    },
  });

  return (
    <Form
      navigationTitle={profile ? `Edit Profile · ${profile.name}` : "New Profile"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Profile Name" placeholder="e.g. Development / Staging" {...itemProps.name} />
      <Form.TextArea
        title="Host Mappings"
        placeholder={"One mapping per line: IP hostname [# comment]\nExample:\n127.0.0.1 api.local # local API"}
        info="One mapping per line, separated by spaces between IP and hostname. Optional # for a comment."
        enableMarkdown={false}
        {...itemProps.entries}
      />
    </Form>
  );
}
