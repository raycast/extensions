import { Action, ActionPanel, Alert, confirmAlert, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { Blocklist, currentProfile, loadBlocklist, saveBlocklist } from "./blocklist";

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

export default function Command() {
  const profile = useMemo(currentProfile, []);
  return <ManageHiddenSuggestions profile={profile} />;
}
