import { ActionPanel, Action, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Conversation, Chat } from "../types";
import { useConversations } from "../hooks/useConversations";
import { queryCloudflareAIWithHistory } from "../api";
import { chatsToMessages, limitConversationLength } from "../utils/chat";
import { formatModelName } from "../models";

interface ConversationViewProps {
  conversation: Conversation;
}

export function ConversationView({ conversation: initialConversation }: ConversationViewProps) {
  const [conversation, setConversation] = useState<Conversation>(initialConversation);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const conversations = useConversations();

  async function handleFollowUp() {
    if (!searchText.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a question",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Asking follow-up question...",
    });

    try {
      // Limit conversation to last 25 exchanges to avoid token limits
      const limitedChats = limitConversationLength(conversation.chats);

      // Transform existing chats to messages
      const existingMessages = chatsToMessages(limitedChats);

      // Add new user question
      const messages = [...existingMessages, { role: "user" as const, content: searchText }];

      // Query API with full conversation history
      const response = await queryCloudflareAIWithHistory(messages, conversation.model);

      // Create new chat object
      const newChat: Chat = {
        id: uuidv4(),
        question: searchText,
        answer: response,
        created_at: new Date().toISOString(),
      };

      // Update conversation
      const updatedConversation: Conversation = {
        ...conversation,
        chats: [...conversation.chats, newChat],
        updated_at: new Date().toISOString(),
      };

      setConversation(updatedConversation);
      await conversations.update(updatedConversation);

      toast.style = Toast.Style.Success;
      toast.title = "Response received";
      setSearchText("");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to get response";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePinToggle() {
    const updatedConversation = {
      ...conversation,
      pinned: !conversation.pinned,
      updated_at: new Date().toISOString(),
    };
    setConversation(updatedConversation);
    await conversations.update(updatedConversation);

    showToast({
      style: Toast.Style.Success,
      title: updatedConversation.pinned ? "Conversation pinned" : "Conversation unpinned",
    });
  }

  async function handleDelete() {
    await conversations.remove(conversation);
  }

  return (
    <List
      isLoading={isLoading || conversations.isLoading}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Ask a follow-up question..."
      navigationTitle={`${formatModelName(conversation.model)} • ${conversation.chats.length} exchanges`}
    >
      {conversation.chats.map((chat, idx) => (
        <List.Item
          key={chat.id}
          title={`Q${idx + 1}: ${chat.question}`}
          icon={{ source: Icon.Message, tintColor: Color.Blue }}
          detail={<List.Item.Detail markdown={`## Question\n\n${chat.question}\n\n## Answer\n\n${chat.answer}`} />}
          actions={
            <ActionPanel>
              {searchText && <Action title="Ask Follow-Up" icon={Icon.Message} onAction={handleFollowUp} />}
              <Action.CopyToClipboard
                title="Copy Answer"
                content={chat.answer}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Question & Answer"
                content={`Q: ${chat.question}\n\nA: ${chat.answer}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              {idx === conversation.chats.length - 1 && (
                <>
                  <Action
                    title={conversation.pinned ? "Unpin Conversation" : "Pin Conversation"}
                    icon={conversation.pinned ? Icon.PinDisabled : Icon.Pin}
                    onAction={handlePinToggle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                  <Action
                    title="Delete Conversation"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleDelete}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
