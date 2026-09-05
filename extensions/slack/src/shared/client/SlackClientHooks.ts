import { handleError } from "../utils";
import { SlackClient } from "./SlackClient";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useRef } from "react";
import { mergeDirectorySearchResults } from "./directory";

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
  const conversationSearchAbortable = useRef<AbortController>(null);

  const users = usePromise(
    (searchText: string) => SlackClient.searchUsers(searchText, userSearchAbortable.current?.signal),
    [query],
    {
      abortable: userSearchAbortable,
      onError(error) {
        handleError(error, "Failed to search Slack users");
      },
    },
  );
  const conversations = usePromise(
    (searchText: string) => SlackClient.searchConversations(searchText, conversationSearchAbortable.current?.signal),
    [query],
    {
      abortable: conversationSearchAbortable,
      onError(error) {
        handleError(error, "Failed to search Slack conversations");
      },
    },
  );

  return {
    data: mergeDirectorySearchResults(users.data, conversations.data),
    isLoading: users.isLoading || conversations.isLoading,
  };
};

export const useMe = () => useCachedPromise(SlackClient.getMe);

export const useUnreadConversations = (conversationIds: string[] | undefined) =>
  useCachedPromise((ids) => SlackClient.getUnreadConversations(ids), [conversationIds ?? []]);
