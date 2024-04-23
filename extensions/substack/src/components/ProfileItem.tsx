import { useMemo } from "react";

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

import type { Profile, WithDetails } from "@/types";

import ProfilePosts from "@/components/ProfilePosts";

export type ProfileItemProps = WithDetails & {
  profile: Profile;
};

export default function ProfileItem({ profile, toggleDetails, detailsShown }: ProfileItemProps) {
  const accessories = useMemo(() => {
    if (detailsShown) {
      return [];
    }
    return [
      !profile.subscriberCount || profile.subscriberCount.length === 0
        ? null
        : {
            tag: profile.subscriberCount,
            icon: Icon.Person,
            tooltip: "Estimated amount of subscribers",
          },
      !profile.hasPosts
        ? { tag: "No posts", icon: { source: "empty.svg", tintColor: Color.Red }, tooltip: "No posts found" }
        : null,
    ].filter((a) => a !== null) as Array<{ tag: string; icon: Icon; tooltip: string }>;
  }, [profile, detailsShown]);

  return (
    <List.Item
      title={profile.name}
      subtitle={detailsShown ? undefined : profile.bio}
      icon={{ source: getAvatarIcon(profile.name) }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title={detailsShown ? "Hide Details" : "Show Details"} onAction={toggleDetails} />
          {profile.handle && (
            <Action.OpenInBrowser
              title="Open on Substack"
              url={`https://substack.com/@${profile.handle}`}
              icon={{ source: "substack.svg" }}
            />
          )}
          <Action.Push
            title="Show Posts"
            target={<ProfilePosts userId={profile.id} />}
            icon={{ source: Icon.List }}
            shortcut={{ key: "o", modifiers: ["cmd"] }}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={`## ${profile.name}

${profile.bio ? `> ${profile.bio}` : ""}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Handle" text={profile.handle ? `@${profile.handle}` : "??"} />
              {profile.handle ? (
                <List.Item.Detail.Metadata.Link
                  title=""
                  target={`https://substack.com/@${profile.handle}`}
                  text="Open on Substack"
                />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Subscribers"
                text={profile.subscriberCount ?? ""}
                icon={profile.subscriberCount ? Icon.Person : undefined}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
