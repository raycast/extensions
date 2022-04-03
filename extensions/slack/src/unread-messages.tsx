import { Action, ActionPanel, Icon, Image, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { isEqual } from "lodash";
import { useEffect, useState } from "react";

import { CacheProvider, onApiError, useChannels, useGroups, useUsers } from "./shared/client";

const conversationsStorageKey = "$unread-messages$selected-conversations";

export default function Command() {
  return (
    <CacheProvider>
      <UnreadMessagesOverview />
    </CacheProvider>
  );
}

function UnreadMessagesOverview() {
  const [selectedConversations, setSelectedConversations] = useState<string[]>();

  const setConversations = async () => {
    const item = await LocalStorage.getItem(conversationsStorageKey);
    const conversations = item ? JSON.parse(item as string) : undefined;
    if (!!conversations && (!selectedConversations || !isEqual(selectedConversations, conversations))) {
      setSelectedConversations(conversations);
    }
  };

  useEffect(() => {
    setConversations();
  }, []);

  useEffect(() => {
    // needed to update selectedConversations after returning from configuration view
    const interval = setInterval(
      setConversations,
      !selectedConversations || selectedConversations.length < 5
        ? 500
        : selectedConversations.length < 10
        ? 10000
        : 30000
    );
    return () => clearInterval(interval);
  }, [selectedConversations]);

  return (
    <List isLoading={!selectedConversations}>
      {selectedConversations && selectedConversations.length === 0 && (
        <List.EmptyView
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action.Push title="Configure" target={<ConfigurationWrapper />} />
            </ActionPanel>
          }
          title="Select Conversations"
          description="You need to configure this command by selecting conversations that you want to observe. You can choose up to 30 due to Slack API restrictions."
        />
      )}
    </List>
  );
}

function ConfigurationWrapper() {
  return (
    <CacheProvider>
      <Configuration />
    </CacheProvider>
  );
}

function Configuration() {
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const { data: users, error: usersError } = useUsers();
  const { data: channels, error: channelsError } = useChannels();
  const { data: groups, error: groupsError } = useGroups();

  useEffect(() => {
    LocalStorage.getItem(conversationsStorageKey).then((item) => {
      if (item) {
        setSelectedConversations(JSON.parse(item as string));
      }
    });
  }, []);

  useEffect(() => {
    // unselect conversations that don't exist anymore
    if (users && channels && groups) {
      setSelectedConversations(
        selectedConversations.filter(
          (id) =>
            !!users.find((user) => user.conversationId === id) ||
            !!channels.find((channel) => channel.id === id) ||
            !!groups.find((group) => group.id === id)
        )
      );
    }
  }, [users, channels]);

  const toggleConversation = (id: string) => {
    let updatedSelectedConversations: string[] | undefined;
    if (selectedConversations.includes(id)) {
      updatedSelectedConversations = selectedConversations.filter((x) => x !== id);
    } else if (selectedConversations.length < 30) {
      updatedSelectedConversations = [...selectedConversations, id];
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Limit reached",
        message: "Unselect a conversation first to select a new one.",
      });
    }

    if (updatedSelectedConversations) {
      setSelectedConversations(updatedSelectedConversations);
      LocalStorage.setItem(conversationsStorageKey, JSON.stringify(updatedSelectedConversations));
    }
  };

  if (!users && usersError && !channels && channelsError && !groups && groupsError) {
    onApiError({ exitExtension: true });
  }

  return (
    <List
      navigationTitle="Unread Messages - Configuration"
      isLoading={
        !selectedConversations || (!users && !usersError) || (!channels && !channelsError) || (!groups && !groupsError)
      }
    >
      <List.Section title="Direct Messages">
        {users
          ?.filter(({ conversationId }) => !!conversationId)
          .map(({ name, conversationId, icon }) => {
            const isConversationSelected = selectedConversations.includes(conversationId!);
            return (
              <List.Item
                key={conversationId}
                title={name}
                icon={isConversationSelected ? Icon.Checkmark : Icon.Circle}
                accessories={[{ icon: { source: icon, mask: Image.Mask.Circle } }]}
                actions={
                  <ActionPanel>
                    <Action
                      title={isConversationSelected ? "Unselect" : "Observe Conversation"}
                      onAction={() => toggleConversation(conversationId!)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
      <List.Section title="Channels">
        {channels?.map(({ name, id, icon }) => {
          const isConversationSelected = selectedConversations.includes(id);
          return (
            <List.Item
              key={id}
              title={name}
              icon={isConversationSelected ? Icon.Checkmark : Icon.Circle}
              accessories={[{ icon }]}
              actions={
                <ActionPanel>
                  <Action
                    title={isConversationSelected ? "Unselect" : "Observe Conversation"}
                    onAction={() => toggleConversation(id)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Groups">
        {groups?.map(({ name, id, icon }) => {
          const isConversationSelected = selectedConversations.includes(id);
          return (
            <List.Item
              key={id}
              title={name}
              icon={isConversationSelected ? Icon.Checkmark : Icon.Circle}
              accessories={[{ icon }]}
              actions={
                <ActionPanel>
                  <Action
                    title={isConversationSelected ? "Unselect" : "Observe Conversation"}
                    onAction={() => toggleConversation(id)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
