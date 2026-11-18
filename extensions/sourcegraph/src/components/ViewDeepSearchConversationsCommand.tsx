import {
  Action,
  ActionPanel,
  Icon,
  List,
  LaunchProps,
  Color,
  Alert,
  confirmAlert,
  showToast,
  Toast,
  Cache,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { DateTime } from "luxon";

import { Sourcegraph, instanceName, LinkBuilder } from "../sourcegraph";
import {
  listDeepSearchConversations,
  deleteDeepSearchConversation,
  DeepSearchConversation,
  DeepSearchStatus,
} from "../sourcegraph/deep-search";
import { ColorDefault } from "./colors";
import { DeepSearchConversationDetail } from "./AskDeepSearchCommand";
import { sentenceCase } from "../text";
import { copyShortcut, deleteShortcut, drilldownShortcut, refreshShortcut, tertiaryActionShortcut } from "./shortcuts";
import { useTelemetry } from "../hooks/telemetry";

const link = new LinkBuilder("deep-search");
const OLD_ITEM_THRESHOLD_MINUTES = 30;

function getCacheKey(src: Sourcegraph): string {
  return `deep-search-conversations-${src.instance}`;
}

export default function ViewDeepSearchConversationsCommand({ src }: { src: Sourcegraph; props?: LaunchProps }) {
  const { recorder } = useTelemetry(src);
  useEffect(() => recorder.recordEvent("viewDeepSearchConversations", "start"), []);

  // Loading past conversations is slow, so cache the last results.
  const cache = useMemo(() => new Cache({ namespace: "deep-search" }), []);
  const cacheKey = getCacheKey(src);
  const [conversations, setConversations] = useState<DeepSearchConversation[]>(() => {
    const cached = cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as DeepSearchConversation[];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  async function loadConversations() {
    setIsLoading(true);
    try {
      const conversations = await listDeepSearchConversations(src);
      if (conversations && conversations.length > 0) {
        // Track only a condensed version
        const newSummaries = conversations.map((c) => ({
          ...c,
          questions: c.questions.map((q) => ({
            ...q,
            answer: undefined,
            turns: undefined,
            sources: undefined,
          })),
        }));
        setConversations(newSummaries);
        cache.set(cacheKey, JSON.stringify(newSummaries));
      } else {
        setConversations([]);
        cache.remove(cacheKey);
      }
    } catch (e) {
      console.error("Failed to list conversations", e);
      await showToast({ title: "Failed to list conversations", style: Toast.Style.Failure, message: String(e) });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  async function handleDelete(id: number) {
    const toast = await showToast({ title: "Deleting conversation...", style: Toast.Style.Animated });
    try {
      await deleteDeepSearchConversation(src, id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      toast.style = Toast.Style.Success;
      toast.title = "Deleted conversation";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete conversation";
      toast.message = String(e);
    }
  }

  const filtered = conversations.filter((c) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    const title = c.title || c.questions[0]?.question || "";
    return title.toLowerCase().includes(q) || c.questions[0]?.question.toLowerCase().includes(q);
  });

  return (
    <List
      key={src.instance}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Filter recent Deep Search conversations on ${instanceName(src)}`}
    >
      {isLoading && conversations.length === 0 && (
        <List.EmptyView title="Loading..." description="Fetching recent conversations" />
      )}

      <List.Section
        title="Recent Conversations"
        subtitle={`${filtered.length} thread${filtered.length === 1 ? "" : "s"}`}
      >
        {filtered.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            src={src}
            conversation={conversation}
            onDelete={() => handleDelete(conversation.id)}
            onRefresh={loadConversations}
          />
        ))}
      </List.Section>
    </List>
  );
}

function statusColor(status: DeepSearchStatus, hasError: boolean): Color.ColorLike {
  if (hasError) {
    return Color.Red;
  }
  switch (status) {
    case "completed":
      return Color.Green;
    case "processing":
      return Color.Blue;
    case "pending":
    default:
      return Color.SecondaryText;
  }
}

function ConversationListItem({
  src,
  conversation,
  onDelete,
  onRefresh,
}: {
  src: Sourcegraph;
  conversation: DeepSearchConversation;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const latestQuestion = conversation.questions[conversation.questions.length - 1];
  const firstQuestion = conversation.questions[0];

  const truncate = (str: string, n: number) => (str.length > n ? str.slice(0, n - 1) + "..." : str);

  const title =
    conversation.title ||
    firstQuestion?.title ||
    (firstQuestion?.question ? truncate(firstQuestion.question, 80) : "Untitled conversation");

  let subtitle = firstQuestion?.question ? truncate(firstQuestion.question, 120) : "";
  if (subtitle === title) {
    subtitle = "";
  }
  const status = latestQuestion?.status ?? "pending";
  const hasError = !!latestQuestion?.error;
  const time = DateTime.fromISO(conversation.updated_at);

  const updatedRelative = time.toRelative() || conversation.updated_at;

  const accessories: List.Item.Accessory[] = [
    {
      date: new Date(conversation.updated_at),
      tooltip: `Last updated ${updatedRelative}`,
    },
  ];

  if (status !== "completed" || hasError) {
    accessories.unshift({
      tag: {
        value: hasError ? "Failed" : sentenceCase(status),
        color: statusColor(status, hasError),
      },
    });
  }

  if (conversation.starred) {
    accessories.unshift({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Starred",
    });
  }

  const conversationUrl =
    conversation.share_url || (conversation.read_token ? link.new(src, `/deepsearch/${conversation.read_token}`) : "");

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={{
        source: conversation.questions.length > 1 ? Icon.SpeechBubbleActive : Icon.SpeechBubble,
        tintColor: Math.abs(time.diffNow().as("minutes")) < OLD_ITEM_THRESHOLD_MINUTES ? ColorDefault : undefined,
      }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Sidebar}
            title="Open"
            target={<DeepSearchConversationDetail src={src} conversationId={conversation.id} />}
            shortcut={drilldownShortcut}
          />
          {conversationUrl && (
            <>
              <Action.OpenInBrowser
                icon={Icon.Globe}
                title="Continue in Browser"
                url={conversationUrl}
                shortcut={tertiaryActionShortcut}
              />
              <Action.CopyToClipboard title="Copy Link" content={conversationUrl} shortcut={copyShortcut} />
            </>
          )}
          <Action icon={Icon.ArrowClockwise} title="Refresh List" shortcut={refreshShortcut} onAction={onRefresh} />
          <Action
            style={Action.Style.Destructive}
            icon={Icon.Trash}
            title="Delete Conversation"
            shortcut={deleteShortcut}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Delete Conversation",
                  message: "Are you sure you want to delete this conversation? This action cannot be undone.",
                  icon: { source: Icon.Trash, tintColor: Color.Red },
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                  },
                })
              ) {
                onDelete();
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
