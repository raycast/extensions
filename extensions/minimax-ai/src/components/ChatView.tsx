import { useState, useEffect, useRef } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Message } from "../providers/base";
import { Conversation } from "../utils/storage";

// Selection timing delays (ms) - allows React to render new items before selecting
const SELECTION_CLEAR_DELAY_MS = 30;
const SELECTION_APPLY_DELAY_MS = 80;

interface ChatViewProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  streamingContent: string;
  isLoading: boolean;
  searchText: string;
  selectedItemId: string;
  selectionTrigger: number;
  onSearchTextChange: (text: string) => void;
  onSubmit: (text: string) => void;
  onNewChat: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
}

function formatConversation(messages: Message[], streamingContent: string): string {
  if (messages.length === 0 && !streamingContent) {
    return `# New Conversation

Type your message above and press **Enter** to send.`;
  }

  let markdown = "";

  for (const message of messages) {
    if (message.role === "user") {
      markdown += `👤 **You**\n\n${message.content}\n\n───\n\n`;
    } else if (message.role === "assistant") {
      markdown += `✨ **Assistant**\n\n${message.content}\n\n───\n\n`;
    }
  }

  if (streamingContent) {
    markdown += `✨ **Assistant**\n\n${streamingContent}\n\n_Generating..._\n\n───\n\n`;
  }

  return markdown;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ChatView({
  conversations,
  currentConversation: _currentConversation,
  messages,
  streamingContent,
  isLoading,
  searchText,
  selectedItemId,
  selectionTrigger,
  onSearchTextChange,
  onSubmit,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
}: ChatViewProps) {
  void _currentConversation; // Reserved for future use
  const markdown = formatConversation(messages, streamingContent);

  // Local selection state - source of truth for the List (like ChatGPT extension)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // REF to block selection changes synchronously during submit
  // This is needed because setIsLoading(true) in parent hasn't propagated yet
  // when clearSearchBar triggers onSelectionChange
  const isSubmittingRef = useRef(false);

  // Sync with parent's selectedItemId using setTimeout (like ChatGPT extension)
  // The delay gives React time to render new items before selecting them
  // selectionTrigger forces re-selection by clearing and re-applying the selection
  useEffect(() => {
    // When trigger changes, force re-selection by setting null first
    // This makes Raycast "forget" the current selection and re-apply it
    const timer1 = setTimeout(() => {
      setSelectedId(null);
    }, SELECTION_CLEAR_DELAY_MS);

    const timer2 = setTimeout(() => {
      isSubmittingRef.current = false;
      setSelectedId(selectedItemId);
    }, SELECTION_APPLY_DELAY_MS);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [selectedItemId, selectionTrigger]);

  const handleSendMessage = () => {
    if (searchText.trim() && !isLoading) {
      isSubmittingRef.current = true; // Set BEFORE onSubmit (synchronous)
      onSubmit(searchText.trim());
      onSearchTextChange("");
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Type a message..."
      selectedItemId={selectedId ?? undefined}
      onSelectionChange={(id) => {
        // Block ALL selection changes during loading OR during submit
        // isSubmittingRef is synchronous, isLoading prop may lag behind
        // Programmatic selection from parent still works via useEffect
        if (!id || id === selectedId || isLoading || isSubmittingRef.current) return;

        setSelectedId(id);

        if (id === "new-chat") {
          onNewChat();
        } else {
          const conv = conversations.find((c) => c.id === id);
          if (conv) {
            onSelectConversation(conv);
          }
        }
      }}
    >
      <List.Item
        id="new-chat"
        icon={Icon.Plus}
        title="New Chat"
        detail={<List.Item.Detail markdown={markdown} />}
        actions={
          <ActionPanel>
            <Action title="Send Message" icon={Icon.Message} onAction={handleSendMessage} />
            <Action
              title="New Chat"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={onNewChat}
            />
          </ActionPanel>
        }
      />

      {conversations.length > 0 && (
        <List.Section title="History">
          {conversations.map((conv) => {
            const isSelected = selectedId === conv.id;
            // Use conv's messages directly to avoid timing issues
            const convMarkdown = isSelected
              ? formatConversation(conv.messages, streamingContent)
              : `**${conv.title}**\n\n${conv.messages.length} messages`;
            const convFullText = conv.messages
              .map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`)
              .join("\n\n");

            return (
              <List.Item
                id={conv.id}
                key={conv.id}
                icon={Icon.Message}
                title={conv.title}
                accessories={[{ text: `${conv.messages.length}` }, { text: formatDate(conv.updatedAt) }]}
                detail={<List.Item.Detail markdown={convMarkdown} />}
                actions={
                  <ActionPanel>
                    <Action title="Send Message" icon={Icon.Message} onAction={handleSendMessage} />
                    <Action
                      title="New Chat"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={onNewChat}
                    />
                    {convFullText && isSelected && (
                      <Action.CopyToClipboard
                        title="Copy Conversation"
                        content={convFullText}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    )}
                    <Action
                      title="Delete"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => onDeleteConversation(conv)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
