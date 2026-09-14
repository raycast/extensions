import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { PostList } from "./components/PostList";
import { ProfileCommentsView } from "./components/ProfileCommentsView";
import { ProfileStats } from "./components/ProfileStats";
import { groupProfiles } from "./lib/grouping";
import { useProfileGroups, useProfiles } from "./lib/hooks";
import { APP_URL } from "./lib/postproxy";
import { platformIcon, platformLabel } from "./lib/platforms";

export default function Profiles() {
  const { data: profiles, isLoading: loadingProfiles, error, revalidate } = useProfiles();
  const { data: groups, isLoading: loadingGroups } = useProfileGroups();
  const [showDetail, setShowDetail] = useState(false);
  const [groupFilter, setGroupFilter] = useState("");

  const grouped = groupProfiles(profiles, groups);
  const visibleGroups = groupFilter ? grouped.filter((group) => group.id === groupFilter) : grouped;

  return (
    <List
      isLoading={loadingProfiles || loadingGroups}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search profiles…"
      searchBarAccessory={
        <List.Dropdown tooltip="Profile group" value={groupFilter} onChange={setGroupFilter}>
          <List.Dropdown.Item icon={Icon.Folder} title="All Groups" value="" />
          <List.Dropdown.Section>
            {grouped.map((group) => (
              <List.Dropdown.Item
                key={group.id}
                icon={Icon.Folder}
                title={`${group.name} (${group.profiles.length})`}
                value={group.id}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && profiles.length === 0 ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : profiles.length === 0 && !loadingProfiles ? (
        <List.EmptyView
          icon={Icon.PersonCircle}
          title="No connected profiles"
          description="Connect social profiles in the Postproxy dashboard."
        />
      ) : (
        visibleGroups.map((group) => {
          const isRealGroup = group.id !== group.name;
          return (
            <List.Section
              key={group.id}
              title={group.name}
              subtitle={isRealGroup ? `${group.id} · ${group.profiles.length}` : `${group.profiles.length}`}
            >
              {group.profiles.map((profile) => (
                <List.Item
                  key={profile.id}
                  icon={platformIcon(profile.platform)}
                  title={profile.name}
                  subtitle={showDetail ? undefined : platformLabel(profile.platform)}
                  accessories={showDetail ? undefined : [{ text: profile.id }, { tag: `${profile.post_count} posts` }]}
                  detail={showDetail ? <ProfileStats profile={profile} groupName={group.name} /> : undefined}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Posts"
                        icon={Icon.Document}
                        target={<PostList profileId={profile.id} navigationTitle={`${profile.name} — Posts`} />}
                      />
                      {profile.platform.toLowerCase() === "google_business" ? (
                        <Action.Push
                          title="View Reviews"
                          icon={Icon.Star}
                          target={<ProfileCommentsView profileId={profile.id} profileName={profile.name} />}
                        />
                      ) : null}
                      <Action
                        title={showDetail ? "Hide Stats" : "Show Stats"}
                        icon={Icon.Sidebar}
                        onAction={() => setShowDetail((value) => !value)}
                      />
                      <Action.OpenInBrowser
                        title="Open Profile on Postproxy"
                        url={`${APP_URL}/profiles/${profile.id}`}
                      />
                      <ActionPanel.Section title={`Group: ${group.name}`}>
                        <Action
                          title="Filter to This Group"
                          icon={Icon.Filter}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                          onAction={() => setGroupFilter(group.id)}
                        />
                        {groupFilter ? (
                          <Action title="Show All Groups" icon={Icon.Globe} onAction={() => setGroupFilter("")} />
                        ) : null}
                        {isRealGroup ? <Action.CopyToClipboard title="Copy Group Id" content={group.id} /> : null}
                      </ActionPanel.Section>
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={() => revalidate()}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })
      )}
    </List>
  );
}
