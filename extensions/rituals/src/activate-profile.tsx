import { Action, ActionPanel, Icon, Image, List, Toast, getApplications, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  activateProfile,
  countActions,
  countTeardown,
  deactivateProfile,
  getProfiles,
  Profile,
  touchProfile,
} from "./lib/profiles";
import ProfileBuilder from "./components/ProfileBuilder";
import RitualDetail from "./components/RitualDetail";

export default function ActivateProfile() {
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

  async function run(profile: Profile, verb: string, runner: typeof activateProfile, count: number) {
    if (count === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing to do", message: `No ${verb} actions.` });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: `${verb} ${profile.name}` });
    const results = await runner(profile, (done, total, label) => {
      toast.message = `${done}/${total} — ${label}`;
    });
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `${profile.name} — done`;
      toast.message = `${results.length} actions ran`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `${profile.name}: ${failed.length} failed`;
      toast.message = failed.map((f) => f.label).join(", ");
    }
    if (runner === activateProfile) {
      await touchProfile(profile.id);
      await load();
    }
  }

  function renderItem(profile: Profile) {
    const accessories: List.Item.Accessory[] = [];
    if (profile.fastMode) accessories.push({ icon: Icon.Bolt, tooltip: "Fast mode" });
    accessories.push({ tag: `${countActions(profile)}` });

    return (
      <List.Item
        key={profile.id}
        icon={profile.icon || Icon.Layers}
        title={profile.name}
        accessories={accessories}
        detail={<RitualDetail profile={profile} appIcon={appIcon} />}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Activate"
                icon={Icon.Play}
                onAction={() => run(profile, "Activating", activateProfile, countActions(profile))}
              />
              <Action
                title="Deactivate"
                icon={Icon.Stop}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => run(profile, "Deactivating", deactivateProfile, countTeardown(profile))}
              />
              <Action
                title="Toggle Details"
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd"], key: "y" }}
                onAction={() => setShowingDetail((v) => !v)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Edit Ritual"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() => push(<ProfileBuilder profile={profile} onSaved={load} />)}
              />
              <Action
                title="Create Ritual"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => push(<ProfileBuilder onSaved={load} />)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  const recent = [...profiles].filter((p) => p.lastUsedAt).sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
  const rest = [...profiles].filter((p) => !p.lastUsedAt).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && profiles.length > 0}
      searchBarPlaceholder="Search rituals…"
    >
      {!isLoading && profiles.length === 0 ? (
        <List.EmptyView
          icon={Icon.Layers}
          title="No rituals yet"
          description="Create one to get started."
          actions={
            <ActionPanel>
              <Action title="Create Ritual" icon={Icon.Plus} onAction={() => push(<ProfileBuilder onSaved={load} />)} />
            </ActionPanel>
          }
        />
      ) : recent.length > 0 ? (
        <>
          <List.Section title="Recent">{recent.map(renderItem)}</List.Section>
          {rest.length > 0 && <List.Section title="All Rituals">{rest.map(renderItem)}</List.Section>}
        </>
      ) : (
        <List.Section title="Rituals">{rest.map(renderItem)}</List.Section>
      )}
    </List>
  );
}
