import useSWR, { Fetcher, useSWRConfig } from "swr";

import { Channel, Group, SlackClient, UnreadChannelInfo, User } from "./SlackClient";

interface DedupingInfo {
  lastUpdate: string | Date;
}
// enable dedupingInterval on command relaunch
export const useSWRDeduping = <Data, Key extends any[] = [string]>({
  key,
  dedupingIntervalMs,
  fetcher,
}: {
  key: Key;
  dedupingIntervalMs: number;
  fetcher: Fetcher<Data, Key>;
}) => {
  const { cache } = useSWRConfig();
  return useSWR(key, (...args) => {
    const chacheDedupingKey = `$swr-deduping$${key}`;
    const cachedDedupingInfo: DedupingInfo | undefined = cache.get(chacheDedupingKey);
    const lastUpdate = cachedDedupingInfo ? new Date(cachedDedupingInfo.lastUpdate) : undefined;

    const cachedItem: Data | undefined = cache.get(key);

    const now = new Date();
    const refetch = !cachedItem || !lastUpdate || lastUpdate.getTime() + dedupingIntervalMs < now.getTime();

    if (refetch) {
      const dedupingInfo: DedupingInfo = { lastUpdate: new Date() };
      cache.set(chacheDedupingKey, dedupingInfo);
      return fetcher(...args);
    }
    return Promise.resolve(cachedItem);
  });
};

export const useUsers = () => useSWR<User[]>("users", SlackClient.getUsers);
export const useChannels = () => useSWR<Channel[]>("channels", SlackClient.getChannels);
export const useGroups = () => useSWR<Group[]>("group-chats", SlackClient.getGroups);

export const useUnreadConversations = (conversationIds: string[] | undefined) =>
  useSWRDeduping<UnreadChannelInfo[], ["unread-conversations", string[]]>({
    key: ["unread-conversations", conversationIds ?? []],
    dedupingIntervalMs: 50000,
    fetcher: (_key, conversationIds) => SlackClient.getUnreadConversations(conversationIds),
  });
