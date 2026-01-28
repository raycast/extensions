import { Action, ActionPanel, Image, List } from "@raycast/api";
import { useState } from "react";

import { Profile, ProfileActionsProps } from "./types";
import { useDebounce } from "./hooks/useDebounce";
import { useProfileSearch, useFarcasterInstalled, truncateAddress, linkify } from "./utils";

export default function Command() {
  const [_searchText, setSearchText] = useState<string>();
  const searchText = useDebounce(_searchText, 500);

  const { data, isLoading } = useProfileSearch(searchText || "");
  const hasFarcaster: boolean = useFarcasterInstalled();

  if ((data as { error: string })?.error) {
    return (
      <List enableFiltering={false} onSearchTextChange={setSearchText} isLoading={isLoading}>
        <List.EmptyView
          title="Type Query to Search"
          description="Search for profiles by name, username, or bio"
          icon="no-view.png"
        />
      </List>
    );
  }

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      isShowingDetail={Object.values(data || []).length > 0 && !isLoading}
    >
      <List.EmptyView
        title={isLoading ? "Searching" : "No Results"}
        icon="no-view.png"
        description={isLoading ? "Reticulating splines..." : "Try changing your search query"}
      />
      {(data as Profile[])?.map((profile: Profile) => {
        return (
          <List.Item
            key={profile.body.id}
            title={profile.body.displayName}
            accessories={[{ text: "@" + profile.body.username }]}
            icon={{
              source: profile.body.avatarUrl,
              mask: Image.Mask.RoundedRectangle,
              fallback: "avatar.png",
            }}
            detail={<ProfileDetails profile={profile} />}
            actions={<Actions profile={profile} farcasterInstalled={hasFarcaster} />}
          />
        );
      })}
    </List>
  );
}

function Actions({ profile, farcasterInstalled }: ProfileActionsProps) {
  return (
    <ActionPanel>
      {farcasterInstalled && (
        <Action.Open title="Open in Warpcast (Desktop)" target={`farcaster://profiles/${profile.body.id}`} />
      )}
      <Action.OpenInBrowser title="Open in Warpcast (Web)" url={`https://warpcast.com/${profile.body.username}`} />
      <Action.OpenInBrowser title="Open in Searchcaster" url={`https://searchcaster.xyz/u/${profile.body.username}`} />
    </ActionPanel>
  );
}

function ProfileDetails({ profile }: { profile: Profile }) {
  // Find all links in bio and replace them with markdown links
  const bio = profile.body.bio;
  const markdown = linkify(bio || "");

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Name"
            text={profile.body.displayName}
            icon={
              profile.body.avatarUrl && {
                source: profile.body.avatarUrl,
                mask: Image.Mask.RoundedRectangle,
              }
            }
          />
          <List.Item.Detail.Metadata.Label title="Username" text={profile.body.username} />
          {profile.body.registeredAt && (
            <List.Item.Detail.Metadata.Label
              title="Registration Date"
              text={new Date(profile.body.registeredAt).toLocaleDateString()}
            />
          )}
          {profile.connectedAddress && (
            <List.Item.Detail.Metadata.Link
              title="Connected Address"
              target={`https://etherscan.io/address/${profile.connectedAddress}`}
              text={truncateAddress(profile.connectedAddress)}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
