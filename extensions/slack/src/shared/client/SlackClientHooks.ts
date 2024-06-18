import { SlackClient } from "./SlackClient";
import { useCachedPromise } from "@raycast/utils";

export const useChannels = () =>
  useCachedPromise(
    () => Promise.all([SlackClient.getUsers(), SlackClient.getChannels(), SlackClient.getGroups()]),
    [],
    { failureToastOptions: { title: "Could not get channels" } },
  );

export const useUnreadConversations = (conversationIds: string[] | undefined) =>
  useCachedPromise((ids) => SlackClient.getUnreadConversations(ids), [conversationIds ?? []]);
