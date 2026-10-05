import {
  Action,
  ActionPanel,
  confirmAlert,
  Form,
  Icon,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getActiveChromeTab, getChromeProfiles } from "../lib/chrome";
import {
  addProfileLink,
  defaultTitle,
  findDuplicateLink,
  isValidUrl,
  parseTags,
  normalizeUrl,
  ProfileLink,
  ProfileLinkInput,
  updateProfileLink,
} from "../lib/storage";

const ASK_EVERY_TIME = "__ask__";

interface FormValues {
  title: string;
  tags: string;
  url: string;
  profileDirectory: string;
}

interface Props {
  /** When given, the form edits this link instead of creating a new one. */
  link?: ProfileLink;
  /** Initial values for a new link, e.g. when duplicating. */
  draft?: Partial<ProfileLinkInput>;
  /** Called after saving. When the form is pushed, it is popped afterwards. */
  onSaved?: () => void;
}

export function ProfileLinkForm({ link, draft, onSaved }: Props) {
  const { pop } = useNavigation();
  const [isPrefilling, setIsPrefilling] = useState(!link && !draft);
  const { data: profiles, isLoading } = usePromise(getChromeProfiles);
  const initial = link ?? draft;

  const {
    handleSubmit,
    itemProps,
    setValue,
    values: currentValues,
  } = useForm<FormValues>({
    initialValues: {
      title: initial?.title ?? "",
      tags: initial?.tags?.join(", ") ?? "",
      url: initial?.url ?? "",
      profileDirectory: initial?.profileDirectory ?? ASK_EVERY_TIME,
    },
    validation: {
      url: (value) => {
        if (!value?.trim()) return "URL is required";
        if (!isValidUrl(value)) return "Enter a valid URL";
      },
      profileDirectory: FormValidation.Required,
    },
    async onSubmit(values) {
      const url = normalizeUrl(values.url);
      const input: ProfileLinkInput = {
        title: values.title.trim() || defaultTitle(url),
        url,
        profileDirectory: values.profileDirectory === ASK_EVERY_TIME ? undefined : values.profileDirectory,
        tags: parseTags(values.tags),
      };

      const duplicate = await findDuplicateLink(input, link?.id);
      if (duplicate) {
        const saveAnyway = await confirmAlert({
          title: "Link Already Saved",
          message: `“${duplicate.title}” already opens this URL in the same profile.`,
          primaryAction: { title: "Save Anyway" },
        });
        if (!saveAnyway) return;
      }

      if (link) {
        await updateProfileLink(link.id, input);
      } else {
        await addProfileLink(input);
      }

      if (onSaved) {
        // Pushed from the link list: go back to it.
        onSaved();
        pop();
        await showToast({
          style: Toast.Style.Success,
          title: link ? "Link updated" : "Link saved",
          message: input.title,
        });
      } else {
        // Standalone command: go back to Raycast's root search, as before launching the command.
        await showToast({ style: Toast.Style.Success, title: "Link saved", message: input.title });
        await popToRoot({ clearSearchBar: false });
      }
    },
  });

  // Prefill from the active Chrome tab when creating a new link from scratch.
  useEffect(() => {
    if (!isPrefilling) return;
    getActiveChromeTab()
      .then((tab) => {
        if (!tab || currentValues.url) return;
        setValue("url", tab.url);
        setValue("title", tab.title);
        if (tab.profileDirectory) setValue("profileDirectory", tab.profileDirectory);
      })
      .catch(() => {
        // Chrome not running or automation permission denied: keep the form empty.
      })
      .finally(() => setIsPrefilling(false));
  }, []);

  return (
    <Form
      isLoading={isLoading || isPrefilling}
      navigationTitle={onSaved ? (link ? "Edit Profile Link" : "Create Profile Link") : undefined}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={link ? "Save Changes" : "Create Link"} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="https://example.com" autoFocus {...itemProps.url} />
      <Form.TextField
        title="Name"
        placeholder="Defaults to the site's domain"
        info="Leave empty to use the domain of the URL."
        {...itemProps.title}
      />
      <Form.Dropdown
        title="Chrome Profile"
        info="Choose “Ask Every Time” to pick the profile when opening the link."
        {...itemProps.profileDirectory}
      >
        <Form.Dropdown.Item value={ASK_EVERY_TIME} title="Ask Every Time" icon={Icon.QuestionMarkCircle} />
        <Form.Dropdown.Section title="Profiles">
          {profiles?.map((profile) => (
            <Form.Dropdown.Item
              key={profile.directory}
              value={profile.directory}
              title={profile.email ? `${profile.name} (${profile.email})` : profile.name}
              icon={profile.icon}
            />
          ))}
        </Form.Dropdown.Section>
        {/* Keep links pointing at a removed profile editable. */}
        {initial?.profileDirectory && profiles && !profiles.some((p) => p.directory === initial.profileDirectory) && (
          <Form.Dropdown.Item
            value={initial.profileDirectory}
            title={`${initial.profileDirectory} (not found)`}
            icon={Icon.Warning}
          />
        )}
      </Form.Dropdown>
      <Form.TextField
        title="Tags"
        placeholder="work, docs"
        info="Optional. Separate tags with commas. Tags are searchable in Search Profile Links."
        {...itemProps.tags}
      />
    </Form>
  );
}
