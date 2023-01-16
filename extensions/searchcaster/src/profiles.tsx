import { Action, ActionPanel, Image, List } from "@raycast/api";
import { Profile, ProfileActionsProps } from "./types";
import { useProfileSearch, useFarcasterInstalled, truncateAddress } from "./utils";
import { useState } from "react";
import Linkify from "linkify-it";
import tlds from "tlds";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { data, isLoading } = useProfileSearch(searchText || "");
  const hasFarcaster: boolean = useFarcasterInstalled();

  if ((data as { error: string })?.error) {
    return (
      <List enableFiltering={false} onSearchTextChange={setSearchText} isLoading={isLoading}>
        <List.EmptyView description="Search for profiles by name, username, or bio" />
      </List>
    );
  }

  return (
    <List enableFiltering={false} onSearchTextChange={setSearchText} isLoading={isLoading} isShowingDetail>
      {isLoading ? (
        <List.EmptyView description="Reticulating splines..." />
      ) : (
        (data as Profile[])?.map((profile: Profile) => {
          return (
            <List.Item
              key={profile.body.id}
              title={profile.body.displayName}
              accessories={[{ text: "@" + profile.body.username }]}
              icon={{
                source: profile.body.avatarUrl,
                mask: Image.Mask.RoundedRectangle,
                fallback: "https://explorer.farcaster.xyz/avatar.png",
              }}
              detail={<ProfileDetails profile={profile} />}
              actions={<Actions profile={profile} farcasterInstalled={hasFarcaster} />}
            />
          );
        })
      )}
    </List>
  );
}

function Actions({ profile, farcasterInstalled }: ProfileActionsProps) {
  return (
    <ActionPanel>
      {farcasterInstalled && (
        <Action.OpenInBrowser title="Open in Farcaster" url={`farcaster://profiles/${profile.body.id}`} />
      )}
      <Action.OpenInBrowser title="Open in Searchcaster" url={`https://searchcaster.xyz/u/${profile.body.username}`} />
    </ActionPanel>
  );
}

function ProfileDetails({ profile }: { profile: Profile }) {
  const linkify = Linkify();
  linkify.tlds(tlds);

  // Find all links in bio and replace them with markdown links
  const bio = profile.body.bio;
  const markdown = linkify.test(bio)
    ? linkify.match(bio)?.reduce((acc, match) => {
        return acc.replace(match.raw, `[${match.raw}](${match.url})`);
      }, bio)
    : bio;

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
