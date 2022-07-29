import { Action, ActionPanel, Icon, Image, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { isEqual } from "lodash";
import { useEffect, useState } from "react";

import {
  CacheProvider,
  Message,
  onApiError,
  SlackClient,
  useChannels,
  useGroups,
  useUnreadConversations,
  useUsers,
} from "./shared/client";
import { UpdatesModal } from "./shared/UpdatesModal";
import { openChannel, timeDifference } from "./shared/utils";

const conversationsStorageKey = "$unread-messages$selected-conversations";

export default function Command() {
  return (
    <CacheProvider>
      <UpdatesModal>
        <UnreadMessagesOverview />
      </UpdatesModal>
    </CacheProvider>
  );
}

function UnreadMessagesOverview() {
  const [selectedConversations, setSelectedConversations] = useState<string[]>();

  const { data: users, error: usersError, isValidating: isValidatingUsers } = useUsers();
  const { data: channels, error: channelsError, isValidating: isValidatingChannels } = useChannels();
  const { data: groups, error: groupsError, isValidating: isValidatingGroups } = useGroups();
  const {
    data: unreadConversations,
    error: unreadConversationsError,
    isValidating: isValidatingUnreadConversations,
    mutate,
  } = useUnreadConversations(selectedConversations);

  const setConversations = async () => {
    const item = await LocalStorage.getItem(conversationsStorageKey);
    let conversations = item ? (JSON.parse(item as string) as string[]).sort() : [];

    // unselect conversations that don't exist anymore
    if (users && channels && groups && !usersError && !channelsError && !groupsError) {
      conversations = conversations.filter(
        (id: string) =>
          !!users.find((user) => user.conversationId === id) ||
          !!channels.find((channel) => channel.id === id) ||
          !!groups.find((group) => group.id === id)
      );

      await LocalStorage.setItem(conversationsStorageKey, JSON.stringify(conversations));
    }

    if (!selectedConversations || !isEqual(selectedConversations, conversations)) {
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

  if (
    (usersError &&
      channelsError &&
      groupsError &&
      !isValidatingUsers &&
      !isValidatingChannels &&
      !isValidatingGroups) ||
    (unreadConversationsError && !isValidatingUnreadConversations)
  ) {
    onApiError({ exitExtension: true });
  }

  const markConversationAsRead = async (conversationId: string, actionTriggeredManually?: boolean): Promise<void> => {
    try {
      await SlackClient.markAsRead(conversationId);

      if (actionTriggeredManually) {
        showToast({
          style: Toast.Style.Success,
          title: `Marked as read`,
        });
      }

      // optimistic rendering: mark conversation as read
      mutate(
        unreadConversations?.filter((c) => c.conversationId !== conversationId),
        { revalidate: false, populateCache: true }
      );
    } catch {
      if (actionTriggeredManually) {
        onApiError();
      }
    }
  };

  return (
    <List isLoading={!selectedConversations || isValidatingUnreadConversations}>
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

      {selectedConversations &&
        selectedConversations.length > 0 &&
        (!unreadConversations || unreadConversations.length === 0) && (
          <List.EmptyView
            actions={
              <ActionPanel>
                <Action.Push title="Configure" target={<ConfigurationWrapper />} />
              </ActionPanel>
            }
            title="No Unread Messages Found"
            description="Configure command again for observing different conversations."
          />
        )}

      {unreadConversations && unreadConversations.length > 0 && (
        <>
          {unreadConversations.map((unreadConversation) => {
            const conversation =
              users?.find((user) => user.conversationId === unreadConversation.conversationId) ??
              channels?.find((channel) => channel.id === unreadConversation.conversationId) ??
              groups?.find((group) => group.id === unreadConversation.conversationId);

            return (
              <List.Item
                key={unreadConversation.conversationId}
                title={conversation?.name ?? ""}
                subtitle={unreadConversation.messageHistory[0].message}
                icon={conversation ? { source: conversation.icon, mask: Image.Mask.Circle } : undefined}
                accessories={[
                  { text: timeDifference(new Date(unreadConversation.messageHistory[0].receivedAt)) },
                  { icon: Icon.Message, text: `${unreadConversation.messageHistory.length}` },
                ]}
                actions={
                  <ActionPanel>
                    {conversation && (
                      <>
                        <Action
                          title="Open in Slack"
                          onAction={() => {
                            markConversationAsRead(unreadConversation.conversationId);
                            openChannel(conversation.teamId, conversation.id);
                          }}
                        />
                        <Action
                          title="Mark as read"
                          onAction={() => markConversationAsRead(unreadConversation.conversationId, true)}
                        />
                      </>
                    )}
                    <Action.Push
                      title="Show unread messages"
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                      target={
                        <CacheProvider>
                          <UnreadMessagesConversation
                            conversationName={conversation?.name ?? ""}
                            messageHistory={unreadConversation.messageHistory}
                          />
                        </CacheProvider>
                      }
                    />
                    <Action.Push
                      title="Configure Command"
                      shortcut={{ modifiers: ["opt"], key: "c" }}
                      target={<ConfigurationWrapper />}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </>
      )}
    </List>
  );
}

function UnreadMessagesConversation({
  conversationName,
  messageHistory,
}: {
  conversationName: string;
  messageHistory: Message[];
}) {
  const { data: users, error: usersError, isValidating: isValidatingUsers } = useUsers();

  if (usersError && !isValidatingUsers) {
    onApiError({ exitExtension: true });
  }

  return (
    <List navigationTitle={`Unread Messages - ${conversationName}`} isLoading={isValidatingUsers} isShowingDetail>
      {messageHistory.map((message, index) => {
        const user = users?.find((u) => u.id === message.senderId);
        return (
          <List.Item
            key={index}
            icon={{ source: user?.icon ?? Icon.Person, mask: Image.Mask.Circle }}
            title={user?.name ?? ""}
            subtitle={timeDifference(new Date(message.receivedAt))}
            detail={<List.Item.Detail markdown={message.message} />}
          />
        );
      })}
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
  const { data: users, error: usersError, isValidating: isValidatingUsers } = useUsers();
  const { data: channels, error: channelsError, isValidating: isValidatingChannels } = useChannels();
  const { data: groups, error: groupsError, isValidating: isValidatingGroups } = useGroups();

  useEffect(() => {
    LocalStorage.getItem(conversationsStorageKey).then((item) => {
      if (item) {
        setSelectedConversations(JSON.parse(item as string));
      }
    });
  }, []);

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

  if (
    usersError &&
    channelsError &&
    groupsError &&
    !isValidatingUsers &&
    !isValidatingChannels &&
    !isValidatingGroups
  ) {
    onApiError({ exitExtension: true });
  }

  return (
    <List
      navigationTitle="Unread Messages - Configuration"
      isLoading={!selectedConversations || isValidatingUsers || isValidatingChannels || isValidatingGroups}
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
