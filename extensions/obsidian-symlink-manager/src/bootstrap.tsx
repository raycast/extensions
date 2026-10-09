import { Action, ActionPanel, Alert, confirmAlert, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { lstat, mkdir, readdir, realpath, symlink } from "node:fs/promises";
import path from "node:path";
import { useEffect, useState } from "react";
import { SourceItemBrowser } from "./components/source-item-browser";
import { pullItem, scanItems } from "./lib/items";
import { listSourceItems, SourceCategory, SourceItem } from "./lib/source-items";
import { getProfiles, Profile, registerVault, setSelectedVault } from "./lib/storage";
import { resolveProfileItems } from "./lib/profile-items";
import {
  enableTargetComponents,
  LINKABLE_SETTINGS_GROUPS,
  linkSettingsGroup,
  mirrorSettings,
  syncSettingChoices,
  type LinkableSettingsGroup,
} from "./lib/core-settings";

const CATEGORIES: { id: SourceCategory; title: string }[] = [
  { id: "plugins", title: "Link Plugins" },
  { id: "themes", title: "Link Themes" },
  { id: "snippets", title: "Link CSS Snippets" },
  { id: "settings", title: "Select Core Settings" },
];

type Selection = Record<SourceCategory, string[]>;

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await lstat(pathname);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function containsPath(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

async function rejectSymlinkedPath(pathname: string): Promise<void> {
  let cursor = path.parse(pathname).root;
  for (const component of pathname.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) throw new Error(`Path contains a symlink: ${cursor}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

async function validateTarget(defaultVault: string, input: string): Promise<string> {
  if (!path.isAbsolute(input.trim())) throw new Error("Enter an absolute target vault path.");
  const target = path.resolve(input.trim());
  await rejectSymlinkedPath(target);
  const origin = await realpath(defaultVault);
  if (containsPath(origin, target) || containsPath(target, origin)) {
    throw new Error("The target vault must be separate from the Default Vault.");
  }
  if (await pathExists(target)) {
    const stats = await lstat(target);
    if (!stats.isDirectory()) throw new Error("The target path is not a directory.");
    if ((await readdir(target)).length > 0) {
      throw new Error("Bootstrap requires a new or empty directory. Open an existing vault in the dashboard instead.");
    }
  }
  return target;
}

async function linkCssSnippetsFolder(defaultVault: string, targetVault: string): Promise<void> {
  const source = path.join(defaultVault, ".obsidian", "snippets");
  const destination = path.join(targetVault, ".obsidian", "snippets");
  const sourceStat = await lstat(source);
  if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) {
    throw new Error("The Default Vault CSS snippets path must be a physical directory.");
  }
  try {
    await lstat(destination);
    throw new Error("The target CSS snippets path already exists.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await symlink(source, destination, "dir");
}

export default function BootstrapVault() {
  const { defaultVaultPath } = getPreferenceValues<{ defaultVaultPath: string }>();
  const [targetPath, setTargetPath] = useState("");
  const [items, setItems] = useState<SourceItem[]>([]);
  const [linkAllSnippets, setLinkAllSnippets] = useState(false);
  const [mirrorCoreSettings, setMirrorCoreSettings] = useState(true);
  const [mirrorFiles, setMirrorFiles] = useState<LinkableSettingsGroup[]>(
    LINKABLE_SETTINGS_GROUPS.map(({ file }) => file),
  );
  const [linkedSettings, setLinkedSettings] = useState<LinkableSettingsGroup[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Selection>({
    plugins: [],
    themes: [],
    snippets: [],
    settings: [],
  });
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([listSourceItems(defaultVaultPath), getProfiles()])
      .then(([sourceItems, storedProfiles]) => {
        if (mounted) {
          setItems(sourceItems);
          setProfiles(storedProfiles);
        }
      })
      .catch((error) =>
        showToast({ style: Toast.Style.Failure, title: "Cannot read Default Vault", message: String(error) }),
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [defaultVaultPath]);

  function chooseProfile(id: string) {
    setProfileId(id);
    const profile = profiles.find((candidate) => candidate.id === id);
    if (!profile) return;
    const profileMirrorFiles = profile.mirrorSettings
      ? (profile.settingsFiles ?? LINKABLE_SETTINGS_GROUPS.map(({ file }) => file))
      : [];
    setMirrorCoreSettings(profileMirrorFiles.length > 0);
    setMirrorFiles(profileMirrorFiles);
    setLinkedSettings(profile.linkedSettings ?? []);
    const chosen = resolveProfileItems(profile, items);
    setSelected({
      plugins: chosen.filter((item) => item.startsWith("plugins/")),
      themes: chosen.filter((item) => item.startsWith("themes/")),
      snippets: linkAllSnippets ? [] : chosen.filter((item) => item.startsWith("snippets/")),
      settings: chosen.filter((item) => item.startsWith("settings/")),
    });
  }

  const selectedCount =
    Object.entries(selected).reduce(
      (count, [category, ids]) =>
        count +
        ((category === "settings" && mirrorCoreSettings) || (category === "snippets" && linkAllSnippets)
          ? 0
          : ids.length),
      0,
    ) +
    (linkAllSnippets ? 1 : 0) +
    (mirrorCoreSettings ? 1 : 0) +
    linkedSettings.length;

  async function submit(selection: Selection) {
    if (submitting) return;
    setSubmitting(true);
    let createdTarget: string | undefined;
    try {
      const target = await validateTarget(defaultVaultPath, targetPath);
      const activeProfile = profiles.find((profile) => profile.id === profileId);
      const currentSource = activeProfile ? await listSourceItems(defaultVaultPath) : items;
      const chosen = new Set(
        activeProfile ? resolveProfileItems(activeProfile, currentSource) : Object.values(selection).flat(),
      );
      if (linkAllSnippets) {
        for (const id of [...chosen]) if (id.startsWith("snippets/")) chosen.delete(id);
      }
      const currentIds = new Set(currentSource.map((item) => item.id));
      if ([...chosen].some((id) => !currentIds.has(id)))
        throw new Error("A selected source item is no longer available.");
      if (chosen.size === 0 && !linkAllSnippets && !mirrorCoreSettings && linkedSettings.length === 0)
        throw new Error("Select at least one configuration item.");

      if (linkedSettings.includes("appearance.json")) {
        const confirmed = await confirmAlert({
          title: "Share Appearance across vaults?",
          message:
            "A live Appearance link also shares which CSS snippets are enabled. Changes in either vault affect both vaults.",
          primaryAction: { title: "Share Appearance", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;
      }

      await mkdir(path.join(target, ".obsidian"), { recursive: true });
      createdTarget = target;
      for (const file of linkedSettings) await linkSettingsGroup(defaultVaultPath, target, file);
      const settingIds = [...chosen].filter(
        (id) => id.startsWith("settings/") && !linkedSettings.some((file) => id.startsWith(`settings/${file}/`)),
      );
      const settingsResult = mirrorCoreSettings
        ? await mirrorSettings(defaultVaultPath, target, mirrorFiles)
        : await syncSettingChoices(defaultVaultPath, target, settingIds);
      for (const id of [...chosen]) if (id.startsWith("settings/")) chosen.delete(id);

      const scanned = await scanItems(defaultVaultPath, target);
      const byId = new Map(scanned.map((item) => [item.id, item]));
      for (const source of currentSource.filter((item) => chosen.has(item.id))) {
        const item = byId.get(source.id);
        if (!item || item.state !== "available") throw new Error(`${source.name} is no longer available to link.`);
        await pullItem(item);
      }
      if (linkAllSnippets) await linkCssSnippetsFolder(defaultVaultPath, target);
      if (activeProfile?.enableSnippets && linkedSettings.includes("appearance.json"))
        throw new Error("Live Appearance already shares snippet activation; edit the profile before bootstrapping.");
      await enableTargetComponents(
        defaultVaultPath,
        target,
        activeProfile?.enablePlugins
          ? currentSource.filter((item) => chosen.has(item.id) && item.category === "plugins").map((item) => item.name)
          : [],
        activeProfile?.enableSnippets
          ? currentSource
              .filter((item) => chosen.has(item.id) && item.category === "snippets")
              .map((item) => item.name.slice(0, -4))
          : [],
      );
      await registerVault(target);
      await setSelectedVault(target);
      await showToast({
        style: Toast.Style.Success,
        title: "Vault bootstrapped",
        message: `${chosen.size + settingsResult.changed + linkedSettings.length + (linkAllSnippets ? 1 : 0)} components or settings added. Plugin activation remains local.`,
      });
    } catch (error) {
      if (createdTarget) {
        await registerVault(createdTarget);
        await setSelectedVault(createdTarget);
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Bootstrap failed",
        message: `${String(error)}${createdTarget ? " The partially created vault is registered for repair in the dashboard." : ""}`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={loading || submitting}
      actions={
        <ActionPanel>
          <Action.Push
            title={`Browse Components (${selectedCount} Selected)`}
            target={
              <SourceItemBrowser
                items={items.filter(
                  (item) =>
                    (!linkAllSnippets || item.category !== "snippets") &&
                    (!mirrorCoreSettings || item.category !== "settings"),
                )}
                initialSelected={Object.values(selected)
                  .flat()
                  .filter((id) => !mirrorCoreSettings || !id.startsWith("settings/"))}
                onChange={(ids) => {
                  setProfileId("");
                  const filteredIds = linkAllSnippets ? ids.filter((id) => !id.startsWith("snippets/")) : ids;
                  setSelected({
                    plugins: filteredIds.filter((id) => id.startsWith("plugins/")),
                    themes: filteredIds.filter((id) => id.startsWith("themes/")),
                    snippets: filteredIds.filter((id) => id.startsWith("snippets/")),
                    settings: filteredIds.filter((id) => id.startsWith("settings/")),
                  });
                }}
                onSubmit={(ids) => {
                  const filteredIds = linkAllSnippets ? ids.filter((id) => !id.startsWith("snippets/")) : ids;
                  return submit({
                    plugins: filteredIds.filter((id) => id.startsWith("plugins/")),
                    themes: filteredIds.filter((id) => id.startsWith("themes/")),
                    snippets: filteredIds.filter((id) => id.startsWith("snippets/")),
                    settings: filteredIds.filter((id) => id.startsWith("settings/")),
                  });
                }}
                submitTitle="Create Vault"
                isLoading={submitting}
              />
            }
          />
          <Action.SubmitForm title="Bootstrap Vault & Link Components" onSubmit={() => submit(selected)} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter an empty vault path, then browse and select Default Vault components. Existing vault data is never replaced." />
      <Form.FilePicker
        id="targetPath"
        title="Target Vault Path"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={targetPath ? [targetPath] : []}
        onChange={(paths) => setTargetPath(paths[0] || "")}
      />
      <Form.Dropdown id="profile" title="Load Profile (Soft Template)" value={profileId} onChange={chooseProfile}>
        <Form.Dropdown.Item value="" title="Custom Selection" />
        {profiles.map((profile) => (
          <Form.Dropdown.Item key={profile.id} value={profile.id} title={profile.name} />
        ))}
      </Form.Dropdown>
      {profiles.find((profile) => profile.id === profileId)?.enablePlugins && (
        <Form.Description text="This profile enables its linked plugins in the new vault." />
      )}
      {profiles.find((profile) => profile.id === profileId)?.enableSnippets && (
        <Form.Description text="This profile enables its linked CSS snippets in the new vault." />
      )}
      {profileId && mirrorCoreSettings && mirrorFiles.length < LINKABLE_SETTINGS_GROUPS.length && (
        <Form.Description
          text={`This profile copies ${mirrorFiles.map((file) => LINKABLE_SETTINGS_GROUPS.find((group) => group.file === file)?.title).join(", ")} settings.`}
        />
      )}
      <Form.Checkbox
        id="linkEditorSettings"
        label="Live link Editor settings"
        value={linkedSettings.includes("app.json")}
        onChange={(value) =>
          setLinkedSettings((current) =>
            value ? [...new Set([...current, "app.json" as const])] : current.filter((file) => file !== "app.json"),
          )
        }
      />
      <Form.Checkbox
        id="linkHotkeys"
        label="Live link Hotkeys"
        value={linkedSettings.includes("hotkeys.json")}
        onChange={(value) =>
          setLinkedSettings((current) =>
            value
              ? [...new Set([...current, "hotkeys.json" as const])]
              : current.filter((file) => file !== "hotkeys.json"),
          )
        }
      />
      <Form.Checkbox
        id="linkAppearance"
        label="Live link Appearance settings"
        value={linkedSettings.includes("appearance.json")}
        onChange={(value) =>
          setLinkedSettings((current) =>
            value
              ? [...new Set([...current, "appearance.json" as const])]
              : current.filter((file) => file !== "appearance.json"),
          )
        }
      />
      {linkedSettings.includes("appearance.json") && (
        <Form.Description text="Live Appearance also shares enabled CSS snippets between these vaults." />
      )}
      <Form.Checkbox
        id="linkAllSnippets"
        label="Link the entire CSS snippets folder"
        value={linkAllSnippets}
        onChange={(value) => {
          setLinkAllSnippets(value);
          if (value) setSelected((current) => ({ ...current, snippets: [] }));
        }}
      />
      {linkAllSnippets && (
        <Form.Description text="The target .obsidian/snippets folder will point to the Default Vault folder. Individual snippet selections are ignored." />
      )}
      {CATEGORIES.filter(
        ({ id }) => (!mirrorCoreSettings || id !== "settings") && (!linkAllSnippets || id !== "snippets"),
      ).map(({ id, title }) => (
        <Form.TagPicker
          key={id}
          id={id}
          title={title}
          value={selected[id]}
          onChange={(value) => {
            setProfileId("");
            setSelected((current) => ({ ...current, [id]: value }));
          }}
        >
          {items
            .filter((item) => item.category === id)
            .map((item) => (
              <Form.TagPicker.Item key={item.id} value={item.id} title={item.name} />
            ))}
        </Form.TagPicker>
      ))}
      <Form.Description
        text={
          linkedSettings.includes("appearance.json")
            ? "Appearance and enabled CSS snippets will be shared. Plugin activation stays local."
            : "Local settings copies keep enabled CSS snippets and plugins specific to each vault."
        }
      />
    </Form>
  );
}
