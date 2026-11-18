import {
  Action,
  ActionPanel,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Profile, HOSTS_PATH } from "./lib/types";
import { loadProfiles, removeProfile, upsertProfile } from "./lib/storage";
import { commitProfiles, ProfilesRollbackError } from "./lib/hosts";
import { flushDns } from "./lib/dns";
import EditProfile from "./edit-profile";

export default function Command() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();

  const refresh = () => {
    setProfiles(loadProfiles());
    setLoading(false);
  };

  useEffect(refresh, []);

  const toggle = (profile: Profile) => {
    const next: Profile = { ...profile, enabled: !profile.enabled };
    const all = upsertProfile(profiles, next);
    try {
      commitProfiles(profiles, all);
    } catch (error) {
      const rollbackFailed = error instanceof ProfilesRollbackError;
      if (rollbackFailed) refresh();
      void showToast({
        style: Toast.Style.Failure,
        title: rollbackFailed
          ? "Profile and Hosts File Out of Sync"
          : "Failed to Update Hosts File",
        message: rollbackFailed
          ? "The profile change was saved, but the hosts file was not updated and rollback failed."
          : "Elevation was declined or the write failed. No changes were made.",
      });
      return;
    }
    refresh();
    void showToast({
      style: Toast.Style.Success,
      title: next.enabled ? "Enabled" : "Disabled",
      message: next.name,
    });
  };

  const del = async (profile: Profile) => {
    const confirmed = await confirmAlert({
      title: `Delete profile "${profile.name}"?`,
      message: "This profile's mappings will be removed from the hosts file.",
      primaryAction: { title: "Delete" },
    });
    if (!confirmed) return;
    const all = removeProfile(profiles, profile.id);
    try {
      commitProfiles(profiles, all);
    } catch (error) {
      const rollbackFailed = error instanceof ProfilesRollbackError;
      if (rollbackFailed) refresh();
      void showToast({
        style: Toast.Style.Failure,
        title: rollbackFailed
          ? "Profile and Hosts File Out of Sync"
          : "Failed to Update Hosts File",
        message: rollbackFailed
          ? "The profile was deleted from storage, but the hosts file was not updated and rollback failed."
          : "Elevation was declined or the write failed. The profile was not deleted.",
      });
      return;
    }
    refresh();
    void showToast({
      style: Toast.Style.Success,
      title: "Deleted",
      message: profile.name,
    });
  };

  const flush = () => {
    try {
      flushDns();
      void showToast({ style: Toast.Style.Success, title: "DNS Flushed" });
    } catch {
      void showToast({
        style: Toast.Style.Failure,
        title: "Failed to Flush DNS",
      });
    }
  };

  const snippet = (profile: Profile) =>
    profile.entries
      .map((e) => `${e.ip}\t${e.hostname}${e.comment ? ` # ${e.comment}` : ""}`)
      .join("\n");

  const detailMarkdown = (p: Profile) => {
    const rows = p.entries
      .map((e) => `| ${e.ip} | ${e.hostname} | ${e.comment ?? ""} |`)
      .join("\n");
    return `# ${p.name}
Status: **${p.enabled ? "Enabled" : "Disabled"}** · Mappings: ${p.entries.length}

| IP | Hostname | Comment |
|----|--------|------|
${rows || "| - | - | - |"}
`;
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search profiles…"
      actions={
        <ActionPanel>
          <Action
            title="New Profile"
            icon={Icon.Plus}
            onAction={() =>
              push(<EditProfile profile={undefined} onDone={refresh} />)
            }
          />
          <Action
            title="Flush DNS"
            icon={Icon.ArrowClockwise}
            onAction={flush}
          />
          <Action.Open
            title="Open Hosts File"
            icon={Icon.Document}
            target={HOSTS_PATH}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Globe}
        title="No Profiles Yet"
        description="Create a profile to start managing your Windows hosts file."
      />
      {profiles.map((p) => (
        <List.Item
          key={p.id}
          title={p.name}
          icon={p.enabled ? Icon.Checkmark : Icon.Circle}
          accessories={[
            { text: p.enabled ? "Enabled" : "Disabled" },
            { text: `${p.entries.length} mappings` },
          ]}
          detail={<List.Item.Detail markdown={detailMarkdown(p)} />}
          actions={
            <ActionPanel>
              <Action
                title={p.enabled ? "Disable Profile" : "Enable Profile"}
                icon={p.enabled ? Icon.Circle : Icon.Checkmark}
                onAction={() => toggle(p)}
              />
              <Action
                title="Edit Profile"
                icon={Icon.Pencil}
                onAction={() =>
                  push(<EditProfile profile={p} onDone={refresh} />)
                }
              />
              <Action
                title="New Profile"
                icon={Icon.Plus}
                onAction={() =>
                  push(<EditProfile profile={undefined} onDone={refresh} />)
                }
              />
              <Action
                title="Delete Profile"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => del(p)}
              />
              <Action.CopyToClipboard
                title="Copy Hosts Snippet"
                content={snippet(p)}
              />
              <Action
                title="Flush DNS"
                icon={Icon.ArrowClockwise}
                onAction={flush}
              />
              <Action.Open
                title="Open Hosts File"
                icon={Icon.Document}
                target={HOSTS_PATH}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
