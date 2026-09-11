import { ActionPanel, Action, List, useNavigation, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { useConversations } from "./hooks/useConversations";
import { ConversationView } from "./components/ConversationView";
import { formatModelName } from "./models";

export default function Conversations() {
  const conversations = useConversations();
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState<string>("");

  // Sort conversations: pinned first, then by updated_at
  const pinnedConversations = conversations.data
    .filter((c) => c.pinned)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const unpinnedConversations = conversations.data
    .filter((c) => !c.pinned)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  async function handlePinToggle(conversationId: string) {
    const conversation = conversations.data.find((c) => c.id === conversationId);
    if (!conversation) return;

    const updatedConversation = {
      ...conversation,
      pinned: !conversation.pinned,
      updated_at: new Date().toISOString(),
    };

    await conversations.update(updatedConversation);

    showToast({
      style: Toast.Style.Success,
      title: updatedConversation.pinned ? "Conversation pinned" : "Conversation unpinned",
    });
  }

  async function handleDelete(conversationId: string) {
    const conversation = conversations.data.find((c) => c.id === conversationId);
    if (!conversation) return;

    await conversations.remove(conversation);
  }

  async function handleClearAll() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Clearing all conversations...",
    });

    try {
      await conversations.clear();
      toast.style = Toast.Style.Success;
      toast.title = "All conversations cleared";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to clear conversations";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  function getConversationTitle(conversation: (typeof conversations.data)[0]): string {
    if (conversation.chats.length === 0) return "Empty conversation";
    // Use first question as title
    return conversation.chats[0].question;
  }

  function getConversationSubtitle(conversation: (typeof conversations.data)[0]): string {
    if (conversation.chats.length === 0) return "";
    // Show snippet of last answer
    const lastAnswer = conversation.chats[conversation.chats.length - 1].answer;
    return lastAnswer.length > 100 ? lastAnswer.substring(0, 100) + "..." : lastAnswer;
  }

  if (conversations.data.length === 0 && !conversations.isLoading) {
    return (
      <List searchBarPlaceholder="Search conversations...">
        <List.EmptyView
          icon={Icon.Message}
          title="No Conversations Yet"
          description="Start a new conversation from 'Query Cloudflare AI' command"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={conversations.isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search conversations..."
    >
      {pinnedConversations.length > 0 && (
        <List.Section title="Pinned" subtitle={pinnedConversations.length.toString()}>
          {pinnedConversations.map((conversation) => (
            <List.Item
              key={conversation.id}
              title={getConversationTitle(conversation)}
              subtitle={getConversationSubtitle(conversation)}
              icon={{ source: Icon.Pin, tintColor: Color.Yellow }}
              accessories={[
                { tag: formatModelName(conversation.model) },
                { text: conversation.chats.length === 1 ? "1 exchange" : `${conversation.chats.length} exchanges` },
                { date: new Date(conversation.updated_at) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Continue Conversation"
                    icon={Icon.Message}
                    onAction={() => push(<ConversationView conversation={conversation} />)}
                  />
                  <Action
                    title="Unpin Conversation"
                    icon={Icon.PinDisabled}
                    onAction={() => handlePinToggle(conversation.id)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Last Answer"
                    content={conversation.chats[conversation.chats.length - 1]?.answer || ""}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Delete Conversation"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(conversation.id)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Recent" subtitle={unpinnedConversations.length.toString()}>
        {unpinnedConversations.map((conversation) => (
          <List.Item
            key={conversation.id}
            title={getConversationTitle(conversation)}
            subtitle={getConversationSubtitle(conversation)}
            icon={{ source: Icon.Message, tintColor: Color.Blue }}
            accessories={[
              { tag: formatModelName(conversation.model) },
              { text: `${conversation.chats.length} exchanges` },
              { date: new Date(conversation.updated_at) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Continue Conversation"
                  icon={Icon.Message}
                  onAction={() => push(<ConversationView conversation={conversation} />)}
                />
                <Action
                  title="Pin Conversation"
                  icon={Icon.Pin}
                  onAction={() => handlePinToggle(conversation.id)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
                <Action.CopyToClipboard
                  title="Copy Last Answer"
                  content={conversation.chats[conversation.chats.length - 1]?.answer || ""}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Delete Conversation"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(conversation.id)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                {unpinnedConversations.length > 0 && (
                  <Action
                    title="Clear All Conversations"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleClearAll}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
