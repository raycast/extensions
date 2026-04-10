import {
  Action,
  ActionPanel,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Conversation, getHistory, deleteConversation, clearHistory } from "./storage";
import { PROVIDERS } from "./providers";
import { formatThinking, renderLatex } from "./utils";

function maybeRenderLatex(text: string, renderLatexMath: boolean): string {
  return renderLatexMath ? renderLatex(text) : text;
}

function formatMessages(
  messages: Conversation["messages"],
  renderLatexMath = false,
  showThinking = true
): string {
  return messages
    .map((m) => {
      let text = "";
      const content = maybeRenderLatex(m.content, renderLatexMath);
      if (m.reasoning) {
        if (showThinking) {
          const reasoning = maybeRenderLatex(m.reasoning, renderLatexMath);
          text += `${formatThinking(reasoning)}\n\n---\n\n`;
        } else {
          text += `> Thinking Process is hidden\n\n---\n\n`;
        }
      }
      text += content;
      return `**${m.role === "user" ? "You" : "Assistant"}**\n\n${text}`;
    })
    .join("\n\n---\n\n");
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getProviderName(providerKey: string): string {
  return PROVIDERS[providerKey]?.name || providerKey;
}

export default function History() {
  const prefs = getPreferenceValues<Preferences>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(!(prefs.defaultHideThinking ?? true));
  const [renderLatexMath, setRenderLatexMath] = useState(prefs.defaultRenderLatexMath ?? false);

  useEffect(() => {
    getHistory().then((history) => {
      setConversations(history);
      setSelectedId(history[0]?.id ?? null);
    });
  }, []);

  const selectedConv = selectedId ? conversations.find((c) => c.id === selectedId) ?? null : null;
  const handleDelete = async (id: string) => {
    const ok = await confirmAlert({
      title: "Delete Conversation",
      message: "Delete this conversation?",
      icon: Icon.Trash,
      primaryAction: { title: "Delete" },
    });
    if (ok) {
      await deleteConversation(id);
      setConversations((previous) => {
        const filtered = previous.filter((conversation) => conversation.id !== id);
        if (selectedId === id) {
          setSelectedId(filtered[0]?.id ?? null);
        }
        return filtered;
      });
    }
  };

  const handleClearAll = async () => {
    const ok = await confirmAlert({
      title: "Clear All History",
      message: "Delete all conversations?",
      icon: Icon.Trash,
      primaryAction: { title: "Clear All" },
    });
    if (ok) {
      await clearHistory();
      setConversations([]);
      setSelectedId(null);
      showToast({ style: Toast.Style.Success, title: "History cleared" });
    }
  };

  return (
    <List
      searchBarPlaceholder="Search conversations…"
      isShowingDetail={!!selectedConv}
      onSelectionChange={(id) => setSelectedId(id ?? null)}
      selectedItemId={selectedId ?? undefined}
      actions={
        <ActionPanel>
          <Action
            title="Configure Extension"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
        </ActionPanel>
      }
    >
      {conversations.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No conversation history"
          description="Your past conversations will appear here"
          actions={
            <ActionPanel>
              <Action
                title="Configure Extension"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
                shortcut={{ modifiers: ["cmd"], key: "," }}
              />
            </ActionPanel>
          }
        />
      ) : (
        conversations.map((conv) => {
          const firstUserMsg = conv.messages?.find((m) => m.role === "user")?.content || "No messages";
          const msgCount = conv.messages?.length || 0;
          return (
            <List.Item
              key={conv.id}
              id={conv.id}
              icon={Icon.SpeechBubble}
              title={firstUserMsg.substring(0, 80)}
              subtitle={`${getProviderName(conv.provider)} · ${msgCount} messages · ${timeAgo(conv.createdAt)}`}
              detail={<List.Item.Detail markdown={formatMessages(conv.messages || [], renderLatexMath, showThinking)} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Full Conversation"
                    content={formatMessages(conv.messages || [], false, showThinking)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  {(conv.messages || []).some((message) => Boolean(message.reasoning)) && (
                    <Action
                      title={showThinking ? "Hide Thinking" : "Show Thinking"}
                      icon={showThinking ? Icon.EyeDisabled : Icon.Eye}
                      onAction={() => setShowThinking((value) => !value)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                    />
                  )}
                  <Action
                    title={renderLatexMath ? "Do Not Render Latex Math" : "Render Latex Math"}
                    icon={renderLatexMath ? Icon.XMarkCircle : Icon.Calculator}
                    onAction={() => setRenderLatexMath((value) => !value)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    onAction={() => handleDelete(conv.id)}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  />
                  <Action
                    title="Clear All"
                    icon={Icon.Trash}
                    onAction={handleClearAll}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                  <Action
                    title="Configure Extension"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                    shortcut={{ modifiers: ["cmd"], key: "," }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
