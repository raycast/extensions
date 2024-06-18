import { Action, ActionPanel, Color, Icon, Image, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { isEqual } from "lodash";
import { useEffect, useState } from "react";

import { Message, onApiError, SlackClient, useAllChannels, useUnreadConversations, useUsers } from "./shared/client";
import { UpdatesModal } from "./shared/UpdatesModal";
import { withSlackClient } from "./shared/withSlackClient";
import { timeDifference } from "./shared/utils";
import { OpenChannelInSlack, useSlackApp } from "./shared/OpenInSlack";

const conversationsStorageKey = "$unread-messages$selected-conversations";

function UnreadMessages() {
  return (
    <UpdatesModal>
      <UnreadMessagesOverview />
    </UpdatesModal>
  );
}

function UnreadMessagesOverview() {
  const [selectedConversations, setSelectedConversations] = useState<string[]>();

  const { isAppInstalled, isLoading } = useSlackApp();
  const { data, isLoading: isLoadingChannels, error: channelsError } = useAllChannels();

  const users = data?.users ?? [];
  const channels = data?.channels ?? [];
  const groups = data?.groups ?? [];

  const {
    data: unreadConversations,
    error: unreadConversationsError,
    isLoading: isLoadingUnreadConversations,
    mutate,
  } = useUnreadConversations(selectedConversations);

  const setConversations = async () => {
    const item = await LocalStorage.getItem(conversationsStorageKey);
    let conversations = item ? (JSON.parse(item as string) as string[]).sort() : [];

    // unselect conversations that don't exist anymore
    if (users && channels && groups && !channelsError) {
      conversations = conversations.filter(
        (id: string) =>
          !!users.find((user) => user.conversationId === id) ||
          !!channels.find((channel) => channel.id === id) ||
          !!groups.find((group) => group.id === id),
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
          : 30000,
    );
    return () => clearInterval(interval);
  }, [selectedConversations]);

  if (channelsError && unreadConversationsError) {
    onApiError({ exitExtension: true });
  }

  const markConversationAsRead = async (conversationId: string, actionTriggeredManually?: boolean): Promise<void> => {
    try {
      await mutate(SlackClient.markAsRead(conversationId), {
        optimisticUpdate(data) {
          return data?.filter((c) => c.conversationId !== conversationId);
        },
      });

      if (actionTriggeredManually) {
        showToast({
          style: Toast.Style.Success,
          title: `Marked as read`,
        });
      }
    } catch {
      if (actionTriggeredManually) {
        onApiError();
      }
    }
  };

  return (
    <List isLoading={!selectedConversations || isLoadingUnreadConversations || isLoadingChannels || isLoading}>
      {selectedConversations && selectedConversations.length === 0 && (
        <List.EmptyView
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Gear} title="Configure" target={<Configuration />} />
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
                <Action.Push icon={Icon.Gear} title="Configure" target={<Configuration />} />
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
                        <OpenChannelInSlack
                          workspaceId={conversation.teamId}
                          channelId={unreadConversation.conversationId}
                          isAppInstalled={isAppInstalled}
                          onAction={() => markConversationAsRead(unreadConversation.conversationId)}
                        />
                        <Action
                          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                          title="Mark as Read"
                          icon={Icon.Checkmark}
                          onAction={() => markConversationAsRead(unreadConversation.conversationId, true)}
                        />
                      </>
                    )}
                    <Action.Push
                      title="Show Unread Messages"
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                      target={
                        <UnreadMessagesConversation
                          conversationName={conversation?.name ?? ""}
                          messageHistory={unreadConversation.messageHistory}
                        />
                      }
                    />
                    <Action.Push
                      title="Configure Command"
                      icon={Icon.Gear}
                      shortcut={{ modifiers: ["opt"], key: "c" }}
                      target={<Configuration />}
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
  const { data: users, error: usersError, isLoading: isLoadingUsers } = useUsers();

  if (usersError) {
    onApiError({ exitExtension: true });
  }

  return (
    <List navigationTitle={`Unread Messages — ${conversationName}`} isLoading={isLoadingUsers} isShowingDetail>
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

function Configuration() {
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const { data, isLoading: isLoadingChannels, error: channelsError } = useAllChannels();

  const users = data?.users ?? [];
  const channels = data?.channels ?? [];
  const groups = data?.groups ?? [];

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

  if (channelsError) {
    onApiError({ exitExtension: true });
  }

  const sections = [
    { title: "Direct Messages", conversations: users.filter(({ conversationId }) => !!conversationId) },
    { title: "Channels", conversations: channels },
    { title: "Groups", conversations: groups },
  ];

  return (
    <List navigationTitle="Unread Messages — Configuration" isLoading={!selectedConversations || isLoadingChannels}>
      {sections.map(({ title, conversations }) => (
        <List.Section key={title} title={title}>
          {conversations?.map(({ name, id, icon }) => {
            const isConversationSelected = selectedConversations.includes(id);
            return (
              <List.Item
                key={id}
                title={name}
                icon={isConversationSelected ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Circle}
                accessories={[{ icon: { source: icon, mask: Image.Mask.Circle } }]}
                actions={
                  <ActionPanel>
                    <Action
                      icon={Icon.Eye}
                      title={isConversationSelected ? "Unselect" : "Observe Conversation"}
                      onAction={() => toggleConversation(id)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

export default withSlackClient(UnreadMessages);
