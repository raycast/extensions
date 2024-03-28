import { ActionPanel, List, Action } from '@raycast/api';
import { useGetProfiles } from './hooks';
import { useCallback, useEffect, useState } from 'react';
import {
  getUserIcon,
  linkify,
  getProfileUrl,
  truncateEthAddress,
  truncateSolAddress,
  getEthAddressUrl,
  getSolanaAddressUrl,
} from './utils/helpers';
import { CastAuthor } from './utils/types';

export default function SearchUsers() {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState('');
  const { data, isLoading } = useGetProfiles(query, cursor);
  const [filteredList, filterList] = useState(data?.users);

  useEffect(() => {
    filterList(
      data?.users.filter(
        (profile) =>
          profile?.username.toLowerCase().includes(query) || profile?.display_name.toLowerCase().includes(query),
      ),
    );
  }, [query]);

  const loadMore = useCallback(() => {
    if (data?.next?.cursor) {
      setCursor(data.next.cursor);
    }
  }, [data]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Profiles"
      searchBarPlaceholder="Search username, display or fid"
      onSearchTextChange={setQuery}
      throttle
      isShowingDetail={!!query}
      pagination={{ onLoadMore: loadMore, hasMore: !!data?.next?.cursor, pageSize: 25 }}
    >
      <List.EmptyView
        title="Type username to search"
        description="Search for profiles by username or FID"
        icon="no-view.png"
      />
      {filteredList?.map((user) => <UserDetails key={user.username} user={user} />)}
    </List>
  );
}

function UserDetails({ user }: { user: CastAuthor }) {
  const markdown = linkify(user?.profile?.bio?.text || '');

  return (
    <List.Item
      title={user.display_name}
      accessories={[{ text: '@' + user.username }]}
      icon={getUserIcon(user)}
      detail={<List.Item.Detail markdown={markdown} metadata={<UserMetaData user={user} />} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View Profile" url={getProfileUrl(user)} />
        </ActionPanel>
      }
    />
  );
}

function UserMetaData({ user }: { user: CastAuthor }) {
  const ethAddress = user.verified_addresses.eth_addresses[0];
  const solAddress = user.verified_addresses.sol_addresses[0];
  const isActive = user.active_status === 'active';
  const isPowerUser = user.power_badge;
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Name" text={user.display_name} icon={getUserIcon(user)} />
      <List.Item.Detail.Metadata.Label title="Username" text={user.username} />
      {(isPowerUser || isActive) && (
        <List.Item.Detail.Metadata.TagList title="Status">
          {isPowerUser && <List.Item.Detail.Metadata.TagList.Item text="Power User" color={'#8A63D2'} />}
          {isActive && <List.Item.Detail.Metadata.TagList.Item text="Active" color={'#34AC80'} />}
        </List.Item.Detail.Metadata.TagList>
      )}
      <List.Item.Detail.Metadata.Label title="FID" text={user.fid.toString()} />
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
      {/* todo: registartion date */}
    </List.Item.Detail.Metadata>
  );
}
