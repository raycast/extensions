import {
  ActionPanel,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";

import { markRead, type UnreadSpace } from "./api/unread";
import { ChatView } from "./components/ChatView";
import { ConversationItem, RefreshAction, ToggleUnreadOnlyAction } from "./components/ConversationItem";
import { MentionItem, MentionsErrorItem } from "./components/MentionItem";
import { showChatError } from "./helpers/feedback";
import {
  mentionsSubtitle,
  parseMentionsDays,
  parseMentionsLimit,
  unreadMessageNames,
  visibleMentions,
  withMentionsRead,
} from "./helpers/my-mentions";
import { latestDate, namesFor, parseView, resolveView, splitSections, type HomeView } from "./helpers/my-messages";
import {
  countMentions,
  MarkReadError,
  parseLookbackDays,
  unreadEmptyView,
  unreadSubtitle,
  unreadSummary,
  withoutSpaces,
} from "./helpers/unread";
import { useMentions, useMovedReadRows, useReadConversations, useUnreadExtras } from "./hooks/useHome";
import { useUnread } from "./hooks/useUnread";

interface LaunchContext {
  /** `unread` opens Unread Only for this launch (Unread Chat passes it). */
  view?: string;
}

function MyMessages({ launchView }: { launchView?: string }) {
  const preferences = getPreferenceValues<Preferences.MyMessages>();
  const lookbackDays = parseLookbackDays(preferences.unreadLookbackDays);
  const [storedView, setStoredView] = useCachedState<HomeView>(
    "my-messages-view",
    parseView(preferences.defaultView) ?? "all",
  );
  // A launch context forces Unread Only for this launch, without changing the remembered view.
  const [launchOverride, setLaunchOverride] = useState(launchView);
  const view = resolveView({ launch: launchOverride, stored: storedView, preference: preferences.defaultView });
  const unreadOnly = view === "unread";

  function setView(next: HomeView) {
    if (next === view) return;
    setLaunchOverride(undefined);
    setStoredView(next);
  }

  const unreadState = useUnread(lookbackDays);
  // Ignore cached data in an older shape (from before totals were added).
  const unread = Array.isArray(unreadState.data?.spaces) ? unreadState.data : undefined;
  const unreadEntries = unread?.spaces ?? [];
  const extras = useUnreadExtras(unreadEntries);
  const replied = new Set(extras.replied);

  // Mentions load alongside unread, with their own unread-mentions search; the shared unread result is the
  // fallback when that search fails.
  const mentionsDays = parseMentionsDays(preferences.mentionsDays);
  const mentions = useMentions(mentionsDays, parseMentionsLimit(preferences.mentionsLimit));
  // Ignore cached data in another shape.
  const mentionsData = Array.isArray(mentions.data?.rows) ? mentions.data : undefined;
  const sharedUnread = unread ? { names: unreadMessageNames(unreadEntries), capped: unread.capped } : undefined;
  const allMentions = visibleMentions(mentionsData?.rows ?? [], sharedUnread, false);
  const shownMentions = visibleMentions(mentionsData?.rows ?? [], sharedUnread, unreadOnly);
  const unreadByName = new Map(unreadEntries.map((entry) => [entry.spaceName, entry]));

  // Wait for an unread result so the Read pages don't spend requests on conversations it lists. Which rows
  // show under Read is decided here, against the latest unread result.
  const reads = useReadConversations(!unreadOnly && !!unread, unreadEntries);
  const sections = splitSections(unreadEntries, unreadOnly ? [] : (reads.data ?? []));
  // Rows that moved from Unread to Read load their newest messages once, so they match a normal Read row.
  const readRows = useMovedReadRows(sections.read, replied);

  // Raycast can't refresh a list command in the background, so this command's root search subtitle shows
  // the unread total from its last load, refresh or mark-as-read. Unread Chat keeps its own subtitle current.
  const subtitle = unread
    ? unreadSubtitle(unread.total, unread.capped, unreadEntries.length, countMentions(unreadEntries))
    : undefined;
  useEffect(() => {
    if (!subtitle || unreadState.isLoading) return;
    updateCommandMetadata({ subtitle }).catch((error) => console.error("Could not update the subtitle", error));
  }, [subtitle, unreadState.isLoading]);

  function refresh() {
    unreadState.revalidate();
    mentions.revalidate();
    if (!unreadOnly) reads.revalidate();
  }

  async function markSpacesRead(targets: UnreadSpace[]) {
    if (targets.length === 0) return;
    const names = targets.map((t) => t.spaceName);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Marking as read" });
    const before = unread;
    const mentionsBefore = mentionsData;
    let marked: string[] = [];
    const write = markRead(names).catch((error: unknown) => {
      if (error instanceof MarkReadError) marked = error.marked;
      throw error;
    });
    try {
      await Promise.all([
        unreadState.mutate(write, {
          optimisticUpdate: (current) => (current ? withoutSpaces(current, names) : current),
          // Put back only the conversations that couldn't be marked.
          rollbackOnError: (current) => (before ? withoutSpaces(before, marked) : current),
          // Past the cap there may be unread conversations that weren't loaded yet.
          shouldRevalidateAfter: !!unread?.capped,
        }),
        // Mentions in these conversations are read too.
        mentions.mutate(write, {
          optimisticUpdate: (current) => withMentionsRead(current, names),
          rollbackOnError: (current) => (mentionsBefore ? withMentionsRead(mentionsBefore, marked) : current),
          shouldRevalidateAfter: false,
        }),
      ]);
      toast.style = Toast.Style.Success;
      toast.title = targets.length === 1 ? `Marked ${targets[0].item.title} as read` : "Marked all as read";
    } catch (error) {
      await toast.hide();
      await showChatError(error, refresh);
    }
  }

  const common = {
    onRefresh: refresh,
    unreadOnly,
    onToggleUnreadOnly: () => setView(unreadOnly ? "all" : "unread"),
    onMarkAllRead: unreadEntries.length > 0 ? () => markSpacesRead(unreadEntries) : undefined,
    // Sending can make the user the last to reply.
    onSent: refresh,
  };

  const isLoading = unreadState.isLoading || mentions.isLoading || (!unreadOnly && reads.isLoading);
  const unreadEmpty = unreadEmptyView(unread, lookbackDays);
  const emptyDescription = unreadOnly
    ? unreadEmpty.description
    : "Conversations you're in show here once Google Chat returns them.";

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Home"
      searchBarPlaceholder={unreadOnly ? "Filter unread conversations" : "Filter conversations"}
      pagination={unreadOnly ? undefined : reads.pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="View" value={view} onChange={(value) => setView(parseView(value) ?? "all")}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="Unread Only" value="unread" icon={Icon.Envelope} />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={
          isLoading
            ? unreadOnly
              ? "Checking for unread messages…"
              : "Loading conversations…"
            : unreadOnly
              ? unreadEmpty.title
              : "No conversations"
        }
        description={isLoading ? undefined : emptyDescription}
        icon={unreadOnly ? Icon.CheckCircle : Icon.SpeechBubble}
        actions={
          <ActionPanel>
            <RefreshAction onRefresh={refresh} />
            <ToggleUnreadOnlyAction unreadOnly={unreadOnly} onToggle={common.onToggleUnreadOnly} />
          </ActionPanel>
        }
      />
      {shownMentions.length > 0 ? (
        <List.Section title="Mentions" subtitle={mentionsSubtitle(allMentions, !!mentionsData?.capped, mentionsDays)}>
          {shownMentions.map((row) => {
            const entry = unreadByName.get(row.item.space.name);
            return (
              <MentionItem
                key={row.message.name}
                {...common}
                row={row}
                unread={row.unread}
                onMarkRead={entry ? () => markSpacesRead([entry]) : undefined}
              />
            );
          })}
        </List.Section>
      ) : mentions.error && !mentionsData && !unreadOnly ? (
        <List.Section title="Mentions">
          <MentionsErrorItem onRetry={() => mentions.revalidate()} />
        </List.Section>
      ) : null}
      <List.Section
        title="Unread"
        subtitle={
          unread && unreadEntries.length > 0
            ? unreadSummary(unread.total, unread.capped, unreadEntries.length)
            : undefined
        }
      >
        {sections.unread.map((entry) => {
          const preview = entry.messages[0];
          return (
            <ConversationItem
              key={entry.spaceName}
              {...common}
              item={entry.item}
              preview={preview}
              names={namesFor(preview, extras.names)}
              youReplied={replied.has(entry.spaceName)}
              latest={latestDate(entry.item.space.lastActiveTime, entry.latestTime)}
              unreadCount={entry.count}
              mentioned={entry.mentioned}
              onMarkRead={() => markSpacesRead([entry])}
            />
          );
        })}
      </List.Section>
      {unreadOnly ? null : (
        <List.Section title="Read">
          {readRows.map((row) => (
            <ConversationItem
              key={row.item.space.name}
              {...common}
              item={row.item}
              preview={row.preview}
              names={row.names}
              youReplied={row.youReplied}
              latest={latestDate(row.latestTime, row.item.space.lastActiveTime)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  return (
    <ChatView>
      <MyMessages launchView={props.launchContext?.view} />
    </ChatView>
  );
}
