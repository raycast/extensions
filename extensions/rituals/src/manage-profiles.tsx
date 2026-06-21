import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Image,
  List,
  Toast,
  confirmAlert,
  getApplications,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { countActions, deleteProfile, getProfiles, Profile } from "./lib/profiles";
import ProfileBuilder from "./components/ProfileBuilder";
import ImportForm from "./components/ImportForm";
import RitualDetail from "./components/RitualDetail";

export default function ManageProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showingDetail, setShowingDetail] = useState(true);
  const { push } = useNavigation();

  const { data: apps } = useCachedPromise(getApplications);
  const appPaths = useMemo(() => new Map((apps ?? []).map((a) => [a.name.toLowerCase(), a.path])), [apps]);
  const appIcon = (name: string): Image.ImageLike => {
    const path = appPaths.get(name.toLowerCase());
    return path ? { fileIcon: path } : Icon.AppWindow;
  };

  async function load() {
    setIsLoading(true);
    setProfiles(await getProfiles());
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(profile: Profile) {
    const confirmed = await confirmAlert({
      title: `Delete "${profile.name}"?`,
      message: "This cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteProfile(profile.id);
    await showToast({ style: Toast.Style.Success, title: "Ritual deleted" });
    load();
  }

  // Import/export actions shared across rows and the empty view.
  const dataActions = (profile?: Profile) => (
    <ActionPanel.Section title="Import / Export">
      {profile && (
        <Action.CopyToClipboard
          title="Export This Ritual (JSON)"
          icon={Icon.Upload}
          content={JSON.stringify([profile], null, 2)}
        />
      )}
      <Action.CopyToClipboard
        title="Export All Rituals (JSON)"
        icon={Icon.Upload}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        content={JSON.stringify(profiles, null, 2)}
      />
      <Action
        title="Import Rituals…"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        onAction={() => push(<ImportForm onImported={load} />)}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && profiles.length > 0}
      searchBarPlaceholder="Search rituals…"
    >
      <List.EmptyView
        icon={Icon.Layers}
        title="No rituals yet"
        description="Press ⌘N to create one."
        actions={
          <ActionPanel>
            <Action title="Create Ritual" icon={Icon.Plus} onAction={() => push(<ProfileBuilder onSaved={load} />)} />
            {dataActions()}
          </ActionPanel>
        }
      />
      {profiles.map((profile) => (
        <List.Item
          key={profile.id}
          icon={profile.icon || Icon.Layers}
          title={profile.name}
          accessories={[{ tag: `${countActions(profile)}` }]}
          detail={<RitualDetail profile={profile} appIcon={appIcon} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Edit Ritual"
                  icon={Icon.Pencil}
                  onAction={() => push(<ProfileBuilder profile={profile} onSaved={load} />)}
                />
                <Action
                  title="Create Ritual"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => push(<ProfileBuilder onSaved={load} />)}
                />
                <Action
                  title="Toggle Details"
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "y" }}
                  onAction={() => setShowingDetail((v) => !v)}
                />
                <Action
                  title="Delete Ritual"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => remove(profile)}
                />
              </ActionPanel.Section>
              {dataActions(profile)}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
