import { useEffect, useState } from "react";
import { Action, Icon, Keyboard, List, updateCommandMetadata } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ThreadActions } from "./components/ThreadActions";
import { ThreadPreview } from "./components/ThreadPreview";
import { nyxe, showApiError } from "./lib/raycast";
import { displayAddress } from "./lib/text";

type Filter = "all" | "unread";

export default function Inbox() {
  const [filter, setFilter] = useState<Filter>("all");
  const [showingDetail, setShowingDetail] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, pagination, revalidate } = useCachedPromise(
    (f: Filter) => async (options: { page: number; cursor?: string }) => {
      const page = await nyxe().inbox({ unread: f === "unread", limit: 25, cursor: options.cursor ?? null });
      return { data: page.threads, hasMore: page.nextCursor !== null, cursor: page.nextCursor ?? undefined };
    },
    [filter],
    { keepPreviousData: true, onError: (err) => showApiError(err, "Couldn't load the inbox") },
  );

  // The unread count as the command's subtitle, refreshed with the list.
  const { data: summary, revalidate: revalidateSummary } = useCachedPromise(() => nyxe().inboxSummary(), [], {
    onError: () => undefined,
  });
  useEffect(() => {
    if (!summary) return;
    void updateCommandMetadata({ subtitle: summary.unread > 0 ? `${summary.unread} unread` : null });
  }, [summary?.unread]);

  const refresh = () => {
    revalidate();
    revalidateSummary();
  };

  const threads = data ?? [];

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail={showingDetail && threads.length > 0}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Filter loaded threads…"
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={filter} onChange={(v) => setFilter(v as Filter)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Unread" value="unread" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Tray}
        title={filter === "unread" ? "Nothing unread" : "Inbox zero"}
        description={filter === "unread" ? "You're all caught up." : "Nothing in your inbox."}
      />
      {threads.map((t) => {
        const last = t.lastMessage;
        return (
          <List.Item
            key={t.threadId}
            id={t.threadId}
            icon={last.isUnread ? { source: Icon.CircleFilled, tintColor: "#d9714f" } : Icon.Envelope}
            title={t.subject?.trim() || "(no subject)"}
            subtitle={showingDetail ? undefined : displayAddress(last.from)}
            keywords={[last.from.email, last.from.name ?? ""]}
            accessories={
              showingDetail
                ? undefined
                : [
                    ...(t.messageCount > 1 ? [{ text: String(t.messageCount), icon: Icon.SpeechBubble }] : []),
                    ...(last.hasAttachment ? [{ icon: Icon.Paperclip }] : []),
                    { date: new Date(last.receivedAt) },
                  ]
            }
            detail={
              <ThreadPreview
                threadId={t.threadId}
                selected={showingDetail && selectedId === t.threadId}
                fallback={last.preview}
              />
            }
            actions={
              <ThreadActions
                threadId={t.threadId}
                subject={t.subject}
                isUnread={last.isUnread}
                senderEmail={last.from.email}
                onChanged={refresh}
                extra={
                  <>
                    <Action
                      title={showingDetail ? "Hide Preview" : "Show Preview"}
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => setShowingDetail((v) => !v)}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={refresh}
                    />
                  </>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
