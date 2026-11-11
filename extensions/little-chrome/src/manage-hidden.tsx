import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { Blocklist, loadBlocklist, saveBlocklist } from "./blocklist";
import { defaultProfile, preferredProfile } from "./profile";

export function ManageHiddenSuggestions({ profile }: { profile: string }) {
  const [blocklist, setBlocklist] = useState<Blocklist>();

  useEffect(() => {
    loadBlocklist(profile).then(setBlocklist);
  }, [profile]);

  async function update(next: Blocklist) {
    await saveBlocklist(profile, next);
    setBlocklist(next);
  }

  const total = blocklist ? blocklist.urls.length + blocklist.hosts.length : 0;
  const unhideAll = total > 0 && (
    <Action
      title="Unhide All"
      icon={Icon.Eye}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Unhide all suggestions?",
            message: `${blocklist!.urls.length} pages and ${blocklist!.hosts.length} sites will appear again.`,
            primaryAction: { title: "Unhide All", style: Alert.ActionStyle.Destructive },
          })
        )
          await update({ urls: [], hosts: [] });
      }}
    />
  );

  const row = (value: string, icon: Icon, remove: () => Blocklist) => (
    <List.Item
      key={value}
      icon={icon}
      title={value}
      actions={
        <ActionPanel>
          <Action title="Unhide" icon={Icon.Eye} onAction={() => update(remove())} />
          <Action.CopyToClipboard title="Copy" content={value} />
          {unhideAll}
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={!blocklist} searchBarPlaceholder="Filter hidden suggestions">
      <List.EmptyView
        icon={Icon.Eye}
        title="No Hidden Suggestions"
        description="Hide a history suggestion with ⌃X (page) or ⌃⇧X (site) in Open Little Chrome."
      />
      {blocklist && (
        <>
          <List.Section title="Sites" subtitle={String(blocklist.hosts.length)}>
            {blocklist.hosts.map((h) =>
              row(h, Icon.Globe, () => ({ ...blocklist, hosts: blocklist.hosts.filter((x) => x !== h) })),
            )}
          </List.Section>
          <List.Section title="Pages" subtitle={String(blocklist.urls.length)}>
            {blocklist.urls.map((u) =>
              row(u, Icon.Document, () => ({ ...blocklist, urls: blocklist.urls.filter((x) => x !== u) })),
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}

export function ProfileNotFound() {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        title={`Chrome profile "${preferredProfile()}" not found`}
        description="Check Default Chrome Profile in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default function Command() {
  const profile = useMemo(defaultProfile, []);
  return profile ? <ManageHiddenSuggestions profile={profile} /> : <ProfileNotFound />;
}
