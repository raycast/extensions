import { Action, ActionPanel, List } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { AwsProfile } from "../lib/profiles";

interface ProfileListProps {
  profiles: AwsProfile[];
  actionTitle: string;
  actionIcon: Action.Props["icon"];
  onSelect: (profile: AwsProfile) => void;
}

export function ProfileList({
  profiles,
  actionTitle,
  actionIcon,
  onSelect,
}: ProfileListProps) {
  // Shared between the Console/CLI commands so a profile used via either one ranks higher in
  // both. Keyed by profile name (what Granted writes to ~/.aws/config), and since `profiles` is
  // always this run's freshly-parsed list, a profile whose role was removed just won't be in it
  // anymore - its old usage history in storage is simply never looked up, no "ghost" shows up.
  const { data: sortedProfiles, visitItem } = useFrecencySorting(profiles, {
    namespace: "aws-profile-usage",
    key: (profile) => profile.name,
    sortUnvisited: (a, b) => a.name.localeCompare(b.name),
  });

  return (
    <List searchBarPlaceholder="Search AWS profiles...">
      {sortedProfiles.length === 0 ? (
        <List.EmptyView
          title="No AWS profiles found"
          description="Add profiles to ~/.aws/config (see Granted docs) and try again."
        />
      ) : (
        sortedProfiles.map((profile) => {
          const subtitleParts = [
            profile.roleName ? `Role: ${profile.roleName}` : undefined,
            profile.accountId ? `Account ID: ${profile.accountId}` : undefined,
          ].filter((part): part is string => Boolean(part));

          return (
            <List.Item
              key={profile.name}
              title={profile.accountName}
              subtitle={subtitleParts.join("   ")}
              accessories={
                profile.region
                  ? [{ text: profile.region, tooltip: "Region" }]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title={actionTitle}
                    icon={actionIcon}
                    onAction={() => {
                      visitItem(profile);
                      onSelect(profile);
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
