import {
  List,
  Detail,
  ActionPanel,
  Action,
  Form,
  Icon,
  Toast,
  showToast,
  Clipboard,
  launchCommand,
  LaunchType,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  listConversations,
  getConversation,
  deleteConversation,
  updateConversationTitle,
} from "./lib/storage";
import type { ChatMessage } from "./lib/types";
import { useOnboarding } from "./lib/use-onboarding";
import { OnboardingForm } from "./onboarding-form";

interface ConversationEntry {
  id: string;
  title: string;
  model: string;
  updatedAt: number;
}

/** Format a full conversation as markdown for clipboard export. */
function formatConversationMarkdown(messages: ChatMessage[]): string {
  let md = "";
  for (const msg of messages) {
    if (msg.role === "system") continue;
    const header = msg.role === "user" ? "## User" : "## Assistant";
    md += `${header}\n${msg.content}\n\n---\n\n`;
  }
  return md.trimEnd();
}

/** Format first few messages as a compact preview for the side panel. */
function formatPreviewMarkdown(messages: ChatMessage[]): string {
  const nonSystem = messages.filter((m) => m.role !== "system");
  if (nonSystem.length === 0) return "*No messages*";
  const preview = nonSystem.slice(0, 6);
  let md = "";
  for (const msg of preview) {
    const label = msg.role === "user" ? "**You**" : "**Assistant**";
    const content =
      msg.content.length > 300 ? msg.content.slice(0, 300) + "…" : msg.content;
    md += `${label}\n\n${content}\n\n---\n\n`;
  }
  if (nonSystem.length > 6) {
    md += `*…${nonSystem.length - 6} more messages*\n`;
  }
  return md.trimEnd();
}

/** Categorise conversations into time groups based on updatedAt. */
function groupByTimePeriod(conversations: ConversationEntry[]): {
  today: ConversationEntry[];
  thisWeek: ConversationEntry[];
  older: ConversationEntry[];
} {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  // Start of this week (Monday)
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - diffToMonday,
  ).getTime();

  const today: ConversationEntry[] = [];
  const thisWeek: ConversationEntry[] = [];
  const older: ConversationEntry[] = [];

  for (const conv of conversations) {
    if (conv.updatedAt >= startOfToday) {
      today.push(conv);
    } else if (conv.updatedAt >= startOfWeek) {
      thisWeek.push(conv);
    } else {
      older.push(conv);
    }
  }

  return { today, thisWeek, older };
}

/** Pushed form for renaming a conversation. */
function RenameForm({
  conversationId,
  currentTitle,
  onRenamed,
}: {
  conversationId: string;
  currentTitle: string;
  onRenamed: (id: string, newTitle: string) => void;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            icon={Icon.Pencil}
            onSubmit={async (values: { title: string }) => {
              const newTitle = values.title.trim();
              if (!newTitle) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Title cannot be empty",
                });
                return;
              }
              try {
                await updateConversationTitle(conversationId, newTitle);
                onRenamed(conversationId, newTitle);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Conversation Renamed",
                });
                pop();
              } catch (err) {
                const msg =
                  err instanceof Error ? err.message : "Unknown error";
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Rename Failed",
                  message: msg,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={currentTitle} />
    </Form>
  );
}

function ConversationsView() {
  const { push } = useNavigation();
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const previewsLoading = useRef(false);

  // Load message previews for all conversations
  useEffect(() => {
    if (conversations.length === 0 || previewsLoading.current) return;
    previewsLoading.current = true;
    let cancelled = false;
    (async () => {
      const loaded: Record<string, string> = {};
      for (const conv of conversations) {
        if (cancelled) break;
        const full = await getConversation(conv.id);
        if (full) {
          loaded[conv.id] = formatPreviewMarkdown(full.messages);
        }
      }
      if (!cancelled) {
        setPreviews(loaded);
        previewsLoading.current = false;
      }
    })();
    return () => {
      cancelled = true;
      previewsLoading.current = false;
    };
  }, [conversations]);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await listConversations();
      setConversations(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load",
        message: msg,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleResume = useCallback(async (convId: string) => {
    try {
      await launchCommand({
        name: "chat",
        type: LaunchType.UserInitiated,
        context: { conversationId: convId },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Launch Chat",
        message: msg,
      });
    }
  }, []);

  const handleDelete = useCallback(async (convId: string) => {
    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      await showToast({
        style: Toast.Style.Success,
        title: "Conversation Deleted",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Delete Failed",
        message: msg,
      });
    }
  }, []);

  const handleExport = useCallback(async (convId: string) => {
    const conversation = await getConversation(convId);
    if (!conversation) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversation Not Found",
      });
      return;
    }
    const markdown = formatConversationMarkdown(conversation.messages);
    await Clipboard.copy(markdown);
    await showToast({
      style: Toast.Style.Success,
      title: "Conversation copied as Markdown",
    });
  }, []);

  const handleCopy = useCallback(async (convId: string, title: string) => {
    const conversation = await getConversation(convId);
    if (!conversation) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversation Not Found",
      });
      return;
    }
    const markdown =
      `# ${title}\n\n` + formatConversationMarkdown(conversation.messages);
    await Clipboard.copy(markdown);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
    });
  }, []);

  const handleRenamed = useCallback((id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
    );
  }, []);

  if (!isLoading && conversations.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Message}
          title="No Conversations Yet"
          description="Start a chat to save conversations"
        />
      </List>
    );
  }

  const renderActions = (conv: ConversationEntry) => (
    <ActionPanel>
      <Action
        title="Resume Conversation"
        icon={Icon.ArrowRight}
        onAction={() => handleResume(conv.id)}
      />
      <Action
        title="Rename"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() =>
          push(
            <RenameForm
              conversationId={conv.id}
              currentTitle={conv.title}
              onRenamed={handleRenamed}
            />,
          )
        }
      />
      <Action
        title="Export as Markdown"
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        onAction={() => handleExport(conv.id)}
      />
      <Action
        title="Delete Conversation"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        onAction={() => handleDelete(conv.id)}
      />
      <Action
        title="Copy Conversation"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        onAction={() => handleCopy(conv.id, conv.title)}
      />
      <Action
        title="Configure Extension"
        icon={Icon.Cog}
        onAction={() => push(<OnboardingForm onComplete={() => {}} />)}
      />
    </ActionPanel>
  );

  const renderItem = (conv: ConversationEntry) => (
    <List.Item
      key={conv.id}
      id={conv.id}
      title={conv.title}
      icon={Icon.Message}
      detail={
        <List.Item.Detail
          markdown={previews[conv.id] || "*Loading preview...*"}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Model"
                text={conv.model}
                icon={Icon.ComputerChip}
              />
              <List.Item.Detail.Metadata.Label
                title="Updated"
                text={new Date(conv.updatedAt).toLocaleString()}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={renderActions(conv)}
    />
  );

  const { today, thisWeek, older } = groupByTimePeriod(conversations);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter conversations..."
    >
      {today.length > 0 && (
        <List.Section title="Today">{today.map(renderItem)}</List.Section>
      )}
      {thisWeek.length > 0 && (
        <List.Section title="This Week">
          {thisWeek.map(renderItem)}
        </List.Section>
      )}
      {older.length > 0 && (
        <List.Section title="Older">{older.map(renderItem)}</List.Section>
      )}
    </List>
  );
}

export default function Conversations() {
  const { needsOnboarding, isChecking, markDone } = useOnboarding();

  if (isChecking) {
    return <Detail isLoading markdown="" />;
  }

  if (needsOnboarding) {
    return <OnboardingForm onComplete={markDone} />;
  }

  return <ConversationsView />;
}
