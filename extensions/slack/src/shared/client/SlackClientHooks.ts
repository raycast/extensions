import { handleError } from "../utils";
import { SlackClient, type User } from "./SlackClient";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { createDirectoryUserSearch, directoryUsersToShow, mergeDirectorySearchResults } from "./directory";
import { getSlackToken } from "./WebClient";
import { identityCacheKey, identityForAccount, loadAccountIdentity } from "./identity";

export const useChannels = () =>
  usePromise(
    async () => {
      const users = await SlackClient.getUsers();
      const channels = await SlackClient.getChannels();
      const groups = await SlackClient.getGroups(users);
      return [users, channels, groups] as const;
    },
    [],
    {
      onError(error) {
        handleError(error, "Failed to load channels");
      },
    },
  );

export const useDirectorySearch = (query: string) => {
  const userSearchAbortable = useRef<AbortController>(null);
  const channelSearchAbortable = useRef<AbortController>(null);
  const conversationSearchAbortable = useRef<AbortController>(null);
  const [preview, setPreview] = useState<{ query: string; users: User[] }>();

  const userSearch = useMemo(
    () =>
      createDirectoryUserSearch(() => {
        const signal = userSearchAbortable.current?.signal;
        return SlackClient.searchDirectoryMembers(query, signal, (matched) => {
          if (signal?.aborted) return;
          setPreview({ query, users: matched });
        });
      }),
    [query],
  );

  const users = usePromise(
    (...args: [string]) => {
      // Keep the query in the hook arguments so each query starts a fresh execution.
      void args;
      return userSearch.getUsers();
    },
    [query],
    {
      abortable: userSearchAbortable,
      onError(error) {
        handleError(error, "Failed to search Slack users");
      },
    },
  );
  const channels = usePromise(
    (searchText: string) =>
      SlackClient.searchConversations(searchText, channelSearchAbortable.current?.signal, undefined, "channels"),
    [query],
    {
      abortable: channelSearchAbortable,
      onError(error) {
        handleError(error, "Failed to search Slack channels");
      },
    },
  );
  const conversations = usePromise(
    (searchText: string) =>
      SlackClient.searchConversations(
        searchText,
        conversationSearchAbortable.current?.signal,
        userSearch.getUserNames,
        "groups",
      ),
    [query],
    {
      abortable: conversationSearchAbortable,
      onError(error) {
        handleError(error, "Failed to search Slack conversations");
      },
    },
  );

  const shownUsers = directoryUsersToShow(query, users.isLoading, preview, users.data);

  return {
    data: mergeDirectorySearchResults(
      shownUsers,
      channels.data || conversations.data ? [channels.data?.[0] ?? [], conversations.data?.[1] ?? []] : undefined,
    ),
    isLoading: users.isLoading || channels.isLoading || conversations.isLoading,
  };
};

const loadMe = (accountKey: string | undefined) => {
  if (accountKey !== identityCacheKey(getSlackToken())) throw new Error("Slack account changed. Please retry.");
  return loadAccountIdentity(accountKey, SlackClient.getMe);
};

export const useMe = () => {
  const accountKey = identityCacheKey(getSlackToken());
  // Retain the last successful auth.test result across refresh failures, but never across accounts.
  const result = useCachedPromise(loadMe, [accountKey], { execute: !!accountKey, keepPreviousData: false });
  return { ...result, data: identityForAccount(result.data, accountKey) };
};

export const useUnreadConversations = (conversationIds: string[] | undefined) =>
  useCachedPromise((ids) => SlackClient.getUnreadConversations(ids), [conversationIds ?? []], {
    onError(error) {
      handleError(error, "Failed to load unread messages");
    },
  });
