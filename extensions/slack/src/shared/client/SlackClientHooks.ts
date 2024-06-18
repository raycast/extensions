import { handleError } from "../utils";
import { SlackClient } from "./SlackClient";
import { useCachedPromise } from "@raycast/utils";

export const useUsers = () =>
  useCachedPromise(SlackClient.getUsers, [], {
    onError(error) {
      handleError(error, "Failed to load users");
    },
  });

export const useChannels = () =>
  useCachedPromise(
    () => Promise.all([SlackClient.getUsers(), SlackClient.getChannels(), SlackClient.getGroups()]),
    [],
    {
      onError(error) {
        handleError(error, "Failed to load channels");
      },
    },
  );

export const useUnreadConversations = (conversationIds: string[] | undefined) =>
  useCachedPromise((ids) => SlackClient.getUnreadConversations(ids), [conversationIds ?? []]);
