import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import path from "node:path";
import { useEffect, useState } from "react";
import { SOURCE_CATEGORIES } from "./components/source-item-browser";
import { pullItem, scanItems } from "./lib/items";
import { listSourceItems, SourceItem } from "./lib/source-items";
import { getProfiles, getSelectedVault, Profile, saveProfiles } from "./lib/storage";
import { resolveProfileItems } from "./lib/profile-items";
import {
  enableTargetComponents,
  LINKABLE_SETTINGS_GROUPS,
  linkSettingsGroup,
  mirrorSettings,
  syncSettingChoices,
  type LinkableSettingsGroup,
} from "./lib/core-settings";

function ProfileEditor({ initial, onSave }: { initial?: Profile; onSave: (profile: Profile) => Promise<void> }) {
  const { pop } = useNavigation();
  const { defaultVaultPath } = getPreferenceValues<{ defaultVaultPath: string }>();
  const [items, setItems] = useState<SourceItem[]>([]);
  const [name, setName] = useState(initial?.name ?? "");
  const [selectedItems, setSelectedItems] = useState<string[]>(
    initial?.items.filter((id) => !id.startsWith("settings/")) ?? [],
  );
  const [allPlugins, setAllPlugins] = useState(initial?.allPlugins ?? false);
  const [allSnippets, setAllSnippets] = useState(initial?.allSnippets ?? false);
  const [linkedSettings, setLinkedSettings] = useState<LinkableSettingsGroup[]>(
    initial
      ? [
          ...new Set([
            ...(initial.linkedSettings ?? []),
            ...(initial.mirrorSettings
              ? (initial.settingsFiles ?? LINKABLE_SETTINGS_GROUPS.map(({ file }) => file))
              : []),
          ]),
        ]
      : LINKABLE_SETTINGS_GROUPS.map(({ file }) => file),
  );
  const [loading, setLoading] = useState(true);
  const hasSavedOptions = Boolean(
    initial?.enablePlugins || initial?.enableSnippets || initial?.mirrorSettings === false,
  );

  useEffect(() => {
    listSourceItems(defaultVaultPath)
      .then((sourceItems) => {
        setItems(sourceItems);
        const available = new Set(sourceItems.map((item) => item.id));
        setSelectedItems((current) => current.filter((id) => available.has(id)));
      })
      .catch((error) =>
        showToast({ style: Toast.Style.Failure, title: "Cannot list source items", message: String(error) }),
      )
      .finally(() => setLoading(false));
  }, [defaultVaultPath]);

  async function submit(ids: string[]) {
    const chosen = ids.filter(
      (id) => !(allPlugins && id.startsWith("plugins/")) && !(allSnippets && id.startsWith("snippets/")),
    );
    const trimmedName = name.trim();
    if (!trimmedName) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a profile name" });
      return;
    }
    if (chosen.length === 0 && !allPlugins && !allSnippets && linkedSettings.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select at least one component" });
      return;
    }
    const available = new Set(items.map((item) => item.id));
    if (ids.some((id) => !available.has(id))) {
      await showToast({ style: Toast.Style.Failure, title: "A selected component is no longer available" });
      return;
    }
    try {
      await onSave({
        ...initial,
        id: initial?.id ?? crypto.randomUUID(),
        name: trimmedName,
        items: chosen,
        allPlugins,
        allSnippets,
        mirrorSettings: false,
        settingsFiles: [],
        linkedSettings,
        enableSnippets: linkedSettings.includes("appearance.json") ? false : initial?.enableSnippets,
      });
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not save profile", message: String(error) });
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Profile" onSubmit={() => submit(selectedItems)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Profile Name" value={name} onChange={setName} placeholder="Minimal Work" />
      <Form.Description
        text={
          hasSavedOptions
            ? "Choose components and settings to link. Existing activation rules are kept."
            : "Choose components and settings to link. Plugin activation stays local."
        }
      />
      <Form.Checkbox
        id="allPlugins"
        label="All plugins (include future additions)"
        value={allPlugins}
        onChange={setAllPlugins}
      />
      <Form.Checkbox
        id="allSnippets"
        label="All CSS snippets (include future additions)"
        value={allSnippets}
        onChange={setAllSnippets}
      />
      {SOURCE_CATEGORIES.filter(
        ({ id }) => id !== "settings" && !(id === "plugins" && allPlugins) && !(id === "snippets" && allSnippets),
      ).map(({ id, title }) => (
        <Form.TagPicker
          key={id}
          id={id}
          title={title}
          value={selectedItems.filter((itemId) => itemId.startsWith(`${id}/`))}
          onChange={(value) =>
            setSelectedItems((current) => [...current.filter((itemId) => !itemId.startsWith(`${id}/`)), ...value])
          }
        >
          {items
            .filter((item) => item.category === id)
            .map((item) => (
              <Form.TagPicker.Item key={item.id} value={item.id} title={item.name} />
            ))}
        </Form.TagPicker>
      ))}
      {LINKABLE_SETTINGS_GROUPS.map(({ file, title }) => (
        <Form.Checkbox
          key={file}
          id={file}
          label={`Copy and symlink ${title} settings`}
          value={linkedSettings.includes(file)}
          onChange={(enabled) => {
            setLinkedSettings((current) =>
              enabled ? [...new Set([...current, file])] : current.filter((selected) => selected !== file),
            );
          }}
        />
      ))}
      <Form.Description text="When applied, an existing local settings file is backed up before the live symlink is created." />
      {linkedSettings.includes("appearance.json") && (
        <Form.Description text="Live Appearance also shares which CSS snippets are enabled." />
      )}
    </Form>
  );
}

export default function Profiles() {
  const { defaultVaultPath } = getPreferenceValues<{ defaultVaultPath: string }>();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfiles()
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, []);

  async function persist(next: Profile[]) {
    await saveProfiles(next);
    setProfiles(next);
  }

  async function apply(profile: Profile) {
    const target = await getSelectedVault();
    if (!target) {
      await showToast({ style: Toast.Style.Failure, title: "Select a target vault in the dashboard first" });
      return;
    }
    const confirmed = await confirmAlert({
      title: `Apply ${profile.name}?`,
      message: `Link missing components to ${path.basename(target)}.${profile.linkedSettings?.length ? ` Back up existing local settings files and symlink ${profile.linkedSettings.map((file) => LINKABLE_SETTINGS_GROUPS.find((group) => group.file === file)?.title).join(", ")} to the Default Vault.` : ""}${profile.mirrorSettings ? " Copy selected settings into local files." : ""}${profile.enablePlugins ? " Linked plugins will be enabled locally." : ""}${profile.enableSnippets ? " Linked CSS snippets will be enabled locally." : ""}${profile.linkedSettings?.includes("appearance.json") ? " Live Appearance also shares enabled CSS snippets." : ""}`,
      primaryAction: { title: "Apply Profile" },
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      const source = await listSourceItems(defaultVaultPath);
      const requested = new Set(resolveProfileItems(profile, source));
      const scanned = await scanItems(defaultVaultPath, target);
      let linked = 0;
      for (const file of profile.linkedSettings ?? []) {
        const result = await linkSettingsGroup(defaultVaultPath, target, file, true);
        if (result.changed) linked++;
      }
      const settingIds = [...requested].filter(
        (id) =>
          id.startsWith("settings/") &&
          !(profile.linkedSettings ?? []).some((file) => id.startsWith(`settings/${file}/`)),
      );
      const settingsResult = profile.mirrorSettings
        ? await mirrorSettings(defaultVaultPath, target, profile.settingsFiles)
        : await syncSettingChoices(defaultVaultPath, target, settingIds);
      linked += settingsResult.changed;
      for (const id of [...requested]) if (id.startsWith("settings/")) requested.delete(id);
      for (const item of scanned.filter(
        (candidate) => requested.has(candidate.id) && candidate.state === "available",
      )) {
        await pullItem(item);
        linked++;
      }
      const after = await scanItems(defaultVaultPath, target);
      const active = after.filter((item) => requested.has(item.id) && item.state === "linked");
      linked += await enableTargetComponents(
        defaultVaultPath,
        target,
        profile.enablePlugins ? active.filter((item) => item.category === "plugins").map((item) => item.name) : [],
        profile.enableSnippets
          ? active.filter((item) => item.category === "snippets").map((item) => item.name.slice(0, -4))
          : [],
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Profile applied",
        message: `${linked} components or settings applied to ${path.basename(target)}.`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Profile stopped before completion",
        message: `${String(error)} Earlier changes may already be applied; review the target vault.`,
      });
    } finally {
      setLoading(false);
    }
  }

  async function deleteProfile(profile: Profile) {
    const confirmed = await confirmAlert({
      title: `Delete ${profile.name}?`,
      message: "This only removes the saved profile. It does not change any vault.",
      primaryAction: { title: "Delete Profile", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await persist(profiles.filter((candidate) => candidate.id !== profile.id));
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search profiles...">
      <List.EmptyView
        title="No Profiles"
        description="Create a reusable selection of configuration items."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Profile"
              target={<ProfileEditor onSave={(profile) => persist([...profiles, profile])} />}
            />
          </ActionPanel>
        }
      />
      {profiles.map((profile) => (
        <List.Item
          key={profile.id}
          icon={Icon.Box}
          title={profile.name}
          subtitle={`${profile.items.length} selected${profile.allPlugins ? " · all plugins" : ""}${profile.allSnippets ? " · all CSS snippets" : ""}${profile.mirrorSettings ? " · mirrors settings" : ""}`}
          actions={
            <ActionPanel>
              <Action title="Apply Profile to Selected Vault" onAction={() => apply(profile)} />
              <Action.Push
                title="Edit Profile"
                target={
                  <ProfileEditor
                    initial={profile}
                    onSave={(edited) => persist(profiles.map((item) => (item.id === edited.id ? edited : item)))}
                  />
                }
              />
              <Action.Push
                title="Create Profile"
                target={<ProfileEditor onSave={(created) => persist([...profiles, created])} />}
              />
              <Action title="Delete Profile" style={Action.Style.Destructive} onAction={() => deleteProfile(profile)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
