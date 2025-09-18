import {
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  confirmAlert,
  showToast,
  Toast,
  Alert,
  LocalStorage,
  Detail,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  getHistories,
  clearHistories,
  deleteConversation,
  DifyHistory,
  updateConversation,
  getConversation,
  Conversation,
} from "./utils/dify-service";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { DifyAppType, getAppTypeText, getAppTypeColor } from "./utils/types";
import Command from "./ask-dify";
import { ConversationEditor } from "./components/conversation-editor";

export default function AskDifyHistory() {
  const [histories, setHistories] = useState<DifyHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");
  // Add sort order state
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const { push } = useNavigation();

  useEffect(() => {
    loadHistories();
  }, []);

  async function loadHistories() {
    setIsLoading(true);
    try {
      const data = await getHistories();
      setHistories(data);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to load histories", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClearHistories() {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "Are you sure you want to clear all conversation history? This action cannot be undone.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearHistories();
      setHistories([]);
      await showToast({
        style: Toast.Style.Success,
        title: "History Cleared",
        message: "All conversation history has been cleared",
      });
    }
  }

  // Delete a single conversation thread
  async function handleDeleteConversation(conversationId: string) {
    const confirmed = await confirmAlert({
      title: "Delete Conversation",
      message: "Are you sure you want to delete this conversation? This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteConversation(conversationId);
        await loadHistories(); // Reload the histories
        await showToast({
          style: Toast.Style.Success,
          title: "Conversation Deleted",
          message: "The conversation has been deleted",
        });
      } catch (error) {
        showFailureToast(error, {
          title: "Failed to delete conversation",
        });
      }
    }
  }

  // Continue a conversation
  function continueConversation(thread: { latestEntry: DifyHistory; conversationId: string }) {
    const appName = thread.latestEntry.used_app || "Dify";
    const appType = thread.latestEntry.app_type as DifyAppType;

    // Check if this is a TextGenerator or Workflow app type
    if (appType === DifyAppType.TextGenerator || appType === DifyAppType.Workflow) {
      // For TextGenerator and Workflow, load the conversation directly
      // without going through the Command component to avoid double navigation
      getConversation(thread.conversationId)
        .then((conversation: Conversation | null) => {
          if (!conversation || conversation.messages.length < 2) {
            showToast({
              style: Toast.Style.Failure,
              title: "Conversation not found",
              message: "Could not load the conversation details",
            });
            return;
          }

          // Get the AI response (we don't need user message anymore)
          const aiResponse = conversation.messages[1];

          // Navigate directly to a Detail view instead of Command component
          // This prevents the double navigation issue
          const DetailView = (
            <Detail
              navigationTitle={`${appName} Response`}
              markdown={aiResponse.content}
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.Label title="App" text={appName} />
                  <Detail.Metadata.TagList title="Type">
                    <Detail.Metadata.TagList.Item text={getAppTypeText(appType)} color={getAppTypeColor(appType)} />
                  </Detail.Metadata.TagList>
                  <Detail.Metadata.Separator />
                  {thread.latestEntry.app_type === DifyAppType.TextGenerator ? (
                    <Detail.Metadata.TagList title="Message ID">
                      <Detail.Metadata.TagList.Item text={thread.latestEntry.message_id} color="#FFD60A" />
                    </Detail.Metadata.TagList>
                  ) : (
                    <Detail.Metadata.TagList title="Conversation ID">
                      <Detail.Metadata.TagList.Item text={thread.conversationId} color="#FFD60A" />
                    </Detail.Metadata.TagList>
                  )}
                </Detail.Metadata>
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Response"
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    content={aiResponse.content}
                  />
                  <Action.CopyToClipboard
                    title="Copy to Clipboard"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    content={
                      thread.latestEntry.app_type === DifyAppType.TextGenerator
                        ? thread.latestEntry.message_id
                        : thread.conversationId
                    }
                  />
                  <Action
                    title="New Conversation"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                    onAction={() => {
                      // Use the same app for the new conversation
                      push(<Command preselectedAppName={appName} />);
                    }}
                  />
                </ActionPanel>
              }
            />
          );

          // Navigate to the detail view
          push(DetailView);
        })
        .catch((error: Error) => {
          showFailureToast(error, {
            title: "Failed to load conversation",
          });
        });
    } else {
      // For ChatflowAgent, use the original approach
      // Store app type in local storage to be retrieved by Command component
      LocalStorage.setItem(`app-type-${thread.conversationId}`, thread.latestEntry.app_type as string).then(() => {
        // Navigate directly to the conversation with conversation ID and app name
        push(<Command conversationId={thread.conversationId} preselectedAppName={appName} />);
      });
    }
  }

  // Generate markdown for a single history entry
  function getHistoryEntryMarkdown(history: DifyHistory, roundNumber: number): string {
    const appName = history.used_app || "Dify";
    const isNonConversational =
      history.app_type === DifyAppType.TextGenerator || history.app_type === DifyAppType.Workflow;

    if (isNonConversational) {
      // For TextGenerator and Workflow, show only the AI response
      return `${history.answer}\n\n`;
    } else {
      // For conversational apps, show both user and AI messages
      return `**#${roundNumber} User**: ${history.question}\n\n**${appName}**: ${history.answer}\n\n`;
    }
  }

  // Get all user questions with numbering
  function getAllUserQuestions(entries: DifyHistory[]): string {
    // Sort entries by timestamp ascending (oldest first)
    const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);

    return sortedEntries.map((entry, index) => `#${index + 1} ${entry.question}\n\n`).join("");
  }

  // Get all AI responses with numbering
  function getAllAIResponses(entries: DifyHistory[]): string {
    // Sort entries by timestamp ascending (oldest first)
    const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);

    return sortedEntries
      .map((entry, index) => {
        const appName = entry.used_app || "Dify";
        return `#${index + 1} ${appName}: ${entry.answer}\n\n`;
      })
      .join("");
  }

  // Generate markdown for the entire conversation thread
  function getConversationMarkdown(thread: {
    latestEntry: DifyHistory;
    allEntries: DifyHistory[];
    conversationId: string;
  }): string {
    const { latestEntry, allEntries } = thread;
    const isNonConversational =
      latestEntry.app_type === DifyAppType.TextGenerator || latestEntry.app_type === DifyAppType.Workflow;

    // If the latest entry has conversation_text and it's the only entry, use it
    if (allEntries.length === 1 && latestEntry.conversation_text) {
      return latestEntry.conversation_text;
    }

    // Generate header with app info (only for conversational apps)
    const appInfo =
      !isNonConversational && latestEntry.used_app
        ? `## ${latestEntry.used_app} (${latestEntry.app_type ? getAppTypeText(latestEntry.app_type as DifyAppType) : "Unknown"})\n\n`
        : "";

    // Generate markdown for each entry in the conversation
    // Sort entries by timestamp ascending (oldest first) to show conversation flow
    const sortedEntries = [...allEntries].sort((a, b) => a.timestamp - b.timestamp);

    // Generate conversation markdown with round numbers
    const conversationContent = sortedEntries.map((entry, index) => getHistoryEntryMarkdown(entry, index + 1)).join("");

    return `${appInfo}${conversationContent}`;
  }

  // Check if a string contains valid JSON and format it
  function formatJsonInMarkdown(markdown: string): string {
    // Ensure markdown is defined before trying to match
    if (!markdown) return "";

    // Regular expression to find JSON objects in the text
    const jsonRegex = /\{[\s\S]*?\}/g;
    const matches = markdown.match(jsonRegex);

    if (!matches) return markdown;

    let result = markdown;

    // Try each potential JSON match
    for (const match of matches) {
      try {
        // Check if it's valid JSON by parsing it
        JSON.parse(match);

        // If we get here, it's valid JSON
        // Make sure the JSON is substantial (not just {} or very small)
        if (match.length > 10) {
          // Format the JSON
          const formattedJson = JSON.stringify(JSON.parse(match), null, 2);

          // Replace the original JSON with formatted JSON in code block
          result = result.replace(match, `\n\n\`\`\`json\n${formattedJson}\n\`\`\`\n\n`);
        }
      } catch (e) {
        // Not valid JSON, continue to next match
        continue;
      }
    }

    return result;
  }

  // Group histories by conversation ID
  const groupedHistories = histories.reduce(
    (acc, history) => {
      // Use conversation ID as the key
      const key = history.conversation_id;

      // If this conversation ID is not in the accumulator yet, add it
      if (!acc[key]) {
        acc[key] = [];
      }

      // Add this history item to the array for this conversation ID
      acc[key].push(history);
      return acc;
    },
    {} as Record<string, DifyHistory[]>,
  );

  // For each conversation, get the most recent entry (first one) for the list view
  // But keep all entries for the detail view
  const conversationThreads = Object.entries(groupedHistories).map(([conversationId, items]) => {
    // Sort by timestamp descending (newest first)
    const sortedItems = [...items].sort((a, b) => b.timestamp - a.timestamp);
    return {
      // The most recent entry for the list view
      latestEntry: sortedItems[0],
      // All entries for the detail view
      allEntries: sortedItems,
      // The conversation ID
      conversationId,
    };
  });

  // Sort all conversation threads by timestamp based on sort order
  const sortedThreads = [...conversationThreads].sort((a, b) => {
    return sortOrder === "newest"
      ? b.latestEntry.timestamp - a.latestEntry.timestamp
      : a.latestEntry.timestamp - b.latestEntry.timestamp;
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search history..."
      isShowingDetail
      selectedItemId={selectedHistoryId}
      onSelectionChange={(id) => setSelectedHistoryId(id || "")}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort Order"
          onChange={(newValue) => setSortOrder(newValue as "newest" | "oldest")}
          value={sortOrder}
        >
          <List.Dropdown.Item title="🔥 Newest First" value="newest" />
          <List.Dropdown.Item title="🕰️ Oldest First" value="oldest" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Clear History"
            icon={Icon.Trash}
            onAction={handleClearHistories}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadHistories}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {sortedThreads.map((thread) => {
        const { latestEntry } = thread;
        const appName = latestEntry.used_app || "Dify";
        const appType = latestEntry.app_type ? getAppTypeText(latestEntry.app_type as DifyAppType) : "Unknown";

        // For TextGenerator and Workflow, use a more compact display
        const isNonConversational =
          latestEntry.app_type === DifyAppType.TextGenerator || latestEntry.app_type === DifyAppType.Workflow;

        // Get title based on app type
        let itemTitle = "";
        if (isNonConversational) {
          // For TextGenerator, use the message_id as the title
          // For Workflow, use the conversation_id
          if (latestEntry.app_type === DifyAppType.TextGenerator) {
            itemTitle = `${appName} - ${latestEntry.message_id.substring(0, 8)}...`;
          } else {
            itemTitle = `${appName} - ${thread.conversationId.substring(0, 8)}...`;
          }
        } else {
          // Use the question as the title for conversational apps
          itemTitle =
            latestEntry.question.length > 60 ? latestEntry.question.substring(0, 60) + "..." : latestEntry.question;
        }

        return (
          <List.Item
            key={thread.conversationId}
            id={thread.conversationId}
            title={itemTitle}
            subtitle={formatDistanceToNow(latestEntry.timestamp, {
              addSuffix: true,
              locale: enUS,
            })}
            accessories={[
              {
                tag: {
                  value: appType,
                  color: getAppTypeColor(latestEntry.app_type as DifyAppType),
                },
                tooltip: `App: ${appName}`,
              },
            ]}
            detail={
              latestEntry.app_type === DifyAppType.TextGenerator || latestEntry.app_type === DifyAppType.Workflow ? (
                // For TextGenerator and Workflow, use a simplified detail view with inputs in JSON format
                <List.Item.Detail
                  markdown={formatJsonInMarkdown(latestEntry.answer)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="App" text={appName} />
                      <List.Item.Detail.Metadata.TagList title="Type">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={appType}
                          color={getAppTypeColor(latestEntry.app_type as DifyAppType)}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      {latestEntry.app_type === DifyAppType.TextGenerator ? (
                        <List.Item.Detail.Metadata.TagList title="Message ID">
                          <List.Item.Detail.Metadata.TagList.Item text={latestEntry.message_id} color="#FFD60A" />
                        </List.Item.Detail.Metadata.TagList>
                      ) : (
                        <List.Item.Detail.Metadata.TagList title="Conversation ID">
                          <List.Item.Detail.Metadata.TagList.Item text={thread.conversationId} color="#FFD60A" />
                        </List.Item.Detail.Metadata.TagList>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              ) : (
                // For conversational apps, use the standard detail view with all metadata
                <List.Item.Detail
                  markdown={formatJsonInMarkdown(getConversationMarkdown(thread))}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="App" text={appName} />
                      <List.Item.Detail.Metadata.TagList title="Type">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={appType}
                          color={getAppTypeColor(latestEntry.app_type as DifyAppType)}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Rounds" text={`${thread.allEntries.length}`} />
                      <List.Item.Detail.Metadata.Label
                        title="Last Update"
                        text={new Date(latestEntry.timestamp).toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      {latestEntry.app_type === DifyAppType.TextGenerator ? (
                        <List.Item.Detail.Metadata.TagList title="Message ID">
                          <List.Item.Detail.Metadata.TagList.Item text={latestEntry.message_id} color="#FFD60A" />
                        </List.Item.Detail.Metadata.TagList>
                      ) : (
                        <List.Item.Detail.Metadata.TagList title="Conversation ID">
                          <List.Item.Detail.Metadata.TagList.Item text={thread.conversationId} color="#FFD60A" />
                        </List.Item.Detail.Metadata.TagList>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              )
            }
            actions={
              <ActionPanel>
                <Action
                  title={latestEntry.app_type === DifyAppType.ChatflowAgent ? "Continue Conversation" : "View Details"}
                  icon={latestEntry.app_type === DifyAppType.ChatflowAgent ? Icon.Bubble : Icon.Eye}
                  onAction={() => continueConversation(thread)}
                />
                <Action
                  title="Edit Conversation"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onAction={() => {
                    push(
                      <ConversationEditor
                        initialText={getConversationMarkdown(thread)}
                        onSave={(text) => {
                          // Update the conversation in the local storage
                          updateConversation(thread.conversationId, text);
                          // Reload histories to reflect changes
                          loadHistories();
                        }}
                      />,
                    );
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Entire Conversation"
                  content={getConversationMarkdown(thread)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Question"
                  content={getAllUserQuestions(thread.allEntries)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Answer"
                  content={getAllAIResponses(thread.allEntries)}
                  shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title={
                    latestEntry.app_type === DifyAppType.TextGenerator ? "Copy Message Id" : "Copy Conversation Id"
                  }
                  content={
                    latestEntry.app_type === DifyAppType.TextGenerator ? latestEntry.message_id : thread.conversationId
                  }
                  shortcut={{ modifiers: ["opt"], key: "c" }}
                />
                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete Conversation"
                    icon={{ source: Icon.Trash, tintColor: "#FF453A" }}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteConversation(thread.conversationId)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                  <Action
                    title="Clear All History"
                    icon={{ source: Icon.Trash, tintColor: "#FF453A" }}
                    style={Action.Style.Destructive}
                    onAction={handleClearHistories}
                  />
                </ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadHistories}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
