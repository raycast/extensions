import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { ChatTurn } from "../continue-chat";
import { modelTitleForValue } from "../model";
import { formatUsageHint, type TokenUsage } from "../token-usage";
import { assistantDetailMarkdown, previewText, userInstructionsMarkdown } from "./markdown";

export type ChatThreadListProps = {
  navigationTitle: string;
  messages: ChatTurn[];
  effectiveSessionModel: string;
  lastRequestUsage: TokenUsage | null;
  /** Sum of token usage across API calls in this chat (follow-ups, regenerates). */
  sessionUsageTotal: TokenUsage | null;
  /** How many API responses contributed to {@link sessionUsageTotal} (for subtitle). */
  usageCallCount: number;
  showTokenUsage: boolean;
  showEstimatedCost: boolean;
  openReply: () => void;
  copyConversationMarkdown: () => void | Promise<void>;
  exportConversationToFile: () => void | Promise<void>;
  runRegenerate: () => void | Promise<void>;
  openSessionModelPicker: () => void;
  /** Shown in the main and file commands; omit in session history (use backToHistory). */
  startOver?: () => void;
  /** Session history command: return to the list instead of starting a new analysis. */
  backToHistory?: () => void;
};

export function ChatThreadList({
  navigationTitle,
  messages,
  effectiveSessionModel,
  lastRequestUsage,
  sessionUsageTotal,
  usageCallCount,
  showTokenUsage,
  showEstimatedCost,
  openReply,
  copyConversationMarkdown,
  exportConversationToFile,
  runRegenerate,
  openSessionModelPicker,
  startOver,
  backToHistory,
}: ChatThreadListProps) {
  const lastIdx = messages.length - 1;
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const usageOpts = { modelValue: effectiveSessionModel, showEstimatedCost };
  let conversationSubtitle = `${modelTitleForValue(effectiveSessionModel)} · ${messages.length} messages`;
  conversationSubtitle += formatUsageHint(lastRequestUsage ?? undefined, showTokenUsage, usageOpts);
  if (showTokenUsage && usageCallCount > 1 && sessionUsageTotal) {
    conversationSubtitle += ` · session` + formatUsageHint(sessionUsageTotal, showTokenUsage, usageOpts);
  }

  const mainActions = (
    <ActionPanel>
      <Action
        title="Continue Chat"
        icon={Icon.Message}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={openReply}
      />
      <Action
        title="Copy Conversation as Markdown"
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={() => void copyConversationMarkdown()}
      />
      <Action
        title="Export Conversation to File"
        icon={Icon.Folder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        onAction={() => void exportConversationToFile()}
      />
      {startOver ? <Action title="New Analysis" icon={Icon.Rewind} onAction={startOver} /> : null}
      {backToHistory ? (
        <Action
          title="Back to History"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["cmd"], key: "[" }}
          onAction={backToHistory}
        />
      ) : null}
      <Action
        title="Regenerate Last Reply"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => void runRegenerate()}
      />
      <Action title="Change Model for This Chat" icon={Icon.Gear} onAction={openSessionModelPicker} />
      {lastAssistant ? <Action.CopyToClipboard title="Copy Last Reply" content={lastAssistant.content} /> : null}
    </ActionPanel>
  );

  return (
    <List
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search in this chat"
      isShowingDetail
      selectedItemId={`msg-${lastIdx}`}
      actions={mainActions}
    >
      <List.Section title="Continue" subtitle="Follow up in this thread">
        <List.Item
          id="continue-chat-cta"
          icon={{ source: Icon.Message, tintColor: Color.Green }}
          title="Continue chat"
          subtitle="Ask a follow-up question"
          accessories={[{ text: "⌘N" }]}
          detail={
            <List.Item.Detail
              markdown={`### Continue this conversation

Press **Continue chat** or **⌘N** to send another message. The thread keeps your current model until you change it.

**Model:** ${modelTitleForValue(effectiveSessionModel)}${formatUsageHint(lastRequestUsage ?? undefined, showTokenUsage, usageOpts)}${usageCallCount > 1 && sessionUsageTotal ? ` · session` + formatUsageHint(sessionUsageTotal, showTokenUsage, usageOpts) : ""}`}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Continue Chat"
                icon={Icon.Message}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={openReply}
              />
              <Action
                title="Copy Conversation as Markdown"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={() => void copyConversationMarkdown()}
              />
              <Action
                title="Export Conversation to File"
                icon={Icon.Folder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                onAction={() => void exportConversationToFile()}
              />
              {startOver ? <Action title="New Analysis" icon={Icon.Rewind} onAction={startOver} /> : null}
              {backToHistory ? (
                <Action
                  title="Back to History"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd"], key: "[" }}
                  onAction={backToHistory}
                />
              ) : null}
              <Action
                title="Regenerate Last Reply"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => void runRegenerate()}
              />
              <Action title="Change Model for This Chat" icon={Icon.Gear} onAction={openSessionModelPicker} />
              {lastAssistant ? (
                <Action.CopyToClipboard title="Copy Last Reply" content={lastAssistant.content} />
              ) : null}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Conversation" subtitle={conversationSubtitle}>
        {messages.map((m, i) => (
          <List.Item
            key={`msg-${i}`}
            id={`msg-${i}`}
            icon={
              m.role === "user"
                ? { source: Icon.Person, tintColor: Color.Blue }
                : { source: Icon.Stars, tintColor: Color.Purple }
            }
            title={m.role === "user" ? "You" : "Assistant"}
            subtitle={previewText(m.content)}
            accessories={[{ text: `${i + 1}/${messages.length}` }]}
            detail={
              <List.Item.Detail
                markdown={m.role === "user" ? userInstructionsMarkdown(m.content) : assistantDetailMarkdown(m.content)}
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={m.role === "user" ? "Copy Message" : "Copy Reply"} content={m.content} />
                <Action title="Continue Chat" icon={Icon.Message} onAction={openReply} />
                <Action
                  title="Regenerate Last Reply"
                  icon={Icon.ArrowClockwise}
                  onAction={() => void runRegenerate()}
                />
                <Action title="Change Model for This Chat" icon={Icon.Gear} onAction={openSessionModelPicker} />
                <Action
                  title="Copy Conversation as Markdown"
                  icon={Icon.Document}
                  onAction={() => void copyConversationMarkdown()}
                />
                <Action
                  title="Export Conversation to File"
                  icon={Icon.Folder}
                  onAction={() => void exportConversationToFile()}
                />
                {startOver ? <Action title="New Analysis" icon={Icon.Rewind} onAction={startOver} /> : null}
                {backToHistory ? (
                  <Action
                    title="Back to History"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                    onAction={backToHistory}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
