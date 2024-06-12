import { SlackClient } from "./SlackClient";
import { useCachedPromise } from "@raycast/utils";

export const useUsers = () => useCachedPromise(SlackClient.getUsers);
export const useChannels = () => useCachedPromise(SlackClient.getChannels);
export const useGroups = () => useCachedPromise(SlackClient.getGroups);

export const useUnreadConversations = (conversationIds: string[] | undefined) =>
  useCachedPromise((ids) => SlackClient.getUnreadConversations(ids), [conversationIds ?? []]);
