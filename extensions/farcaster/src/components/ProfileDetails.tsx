import { ActionPanel, List, Action, Clipboard } from "@raycast/api";
import {
  getUserIcon,
  linkify,
  getProfileUrl,
  truncateEthAddress,
  truncateSolAddress,
  getEthAddressUrl,
  getSolanaAddressUrl,
} from "../utils/helpers";
import { CastAuthor } from "../utils/types";
import ProfileCastList from "./ProfileCastList";

export function ProfileDetails({ user }: { user: CastAuthor }) {
  const markdown = linkify(user?.profile?.bio?.text || "");

  return (
    <List.Item
      title={user.display_name}
      accessories={[{ text: "@" + user.username }]}
      icon={getUserIcon(user)}
      detail={<List.Item.Detail markdown={markdown} metadata={<UserMetaData user={user} />} />}
      actions={
        <ActionPanel>
          <Action.Push title="View Casts" target={<ProfileCastList user={user} />} />
          <Action.OpenInBrowser title="View Profile in Browser" url={getProfileUrl(user)} />
        </ActionPanel>
      }
    />
  );
}

function UserMetaData({ user }: { user: CastAuthor }) {
  const ethAddress = user.verified_addresses.eth_addresses[0];
  const solAddress = user.verified_addresses.sol_addresses[0];
  const isPowerUser = user.power_badge;
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Name" text={user.display_name} icon={getUserIcon(user)} />
      <List.Item.Detail.Metadata.Label title="Username" text={user.username} />
      {isPowerUser && (
        <List.Item.Detail.Metadata.TagList title="Status">
          <List.Item.Detail.Metadata.TagList.Item text="Power User" color={"#8A63D2"} />
        </List.Item.Detail.Metadata.TagList>
      )}
      <List.Item.Detail.Metadata.TagList title="FID">
        <List.Item.Detail.Metadata.TagList.Item
          text={user.fid.toString()}
          color={"#FFF"}
          onAction={() => Clipboard.copy(user.fid)}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Followers" text={user.follower_count.toString()} />
      <List.Item.Detail.Metadata.Label title="Following" text={user.following_count.toString()} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Link
        title="Custody Address"
        text={truncateEthAddress(user.custody_address)}
        target={getEthAddressUrl(user.custody_address)}
      />
      {ethAddress && (
        <List.Item.Detail.Metadata.Link
          title="Ethereum Address"
          text={truncateEthAddress(ethAddress)}
          target={getEthAddressUrl(ethAddress)}
        />
      )}
      {solAddress && (
        <List.Item.Detail.Metadata.Link
          title="Solana Address"
          text={truncateSolAddress(solAddress)}
          target={getSolanaAddressUrl(solAddress)}
        />
      )}
      {/* todo: registration date */}
    </List.Item.Detail.Metadata>
  );
}
