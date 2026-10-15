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
import { showChatError } from "./helpers/feedback";
import { latestDate, namesFor, parseView, resolveView, splitSections, type HomeView } from "./helpers/my-messages";
import { countMentions, parseLookbackDays, unreadSubtitle, unreadSummary, withoutSpaces } from "./helpers/unread";
import { useReadConversations, useUnreadExtras } from "./hooks/useHome";
import { useUnread } from "./hooks/useUnread";

interface LaunchContext {
  /** `unread` opens Unread only for this launch (Unread Chat passes it). */
  view?: string;
}

function MyMessages({ launchView }: { launchView?: string }) {
  const preferences = getPreferenceValues<Preferences.MyMessages>();
  const lookbackDays = parseLookbackDays(preferences.unreadLookbackDays);
  const [storedView, setStoredView] = useCachedState<HomeView>(
    "my-messages-view",
    parseView(preferences.defaultView) ?? "all",
  );
  // A launch context forces Unread only for this launch, without changing the remembered view.
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

  // Wait for the unread result so the Read pages can leave unread conversations out before paging.
  const reads = useReadConversations(
    !unreadOnly && !!unread,
    unreadEntries.map((entry) => entry.spaceName),
  );
  const sections = splitSections(unreadEntries, unreadOnly ? [] : (reads.data ?? []));

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
    if (!unreadOnly) reads.revalidate();
  }

  async function markSpacesRead(targets: UnreadSpace[]) {
    if (targets.length === 0) return;
    const names = targets.map((t) => t.spaceName);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Marking as read" });
    try {
      await unreadState.mutate(markRead(names), {
        optimisticUpdate: (current) => (current ? withoutSpaces(current, names) : current),
        // Past the cap there may be unread conversations that weren't loaded yet.
        shouldRevalidateAfter: !!unread?.capped,
      });
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

  const isLoading = unreadState.isLoading || (!unreadOnly && reads.isLoading);
  const emptyDescription = unreadOnly
    ? unread?.source === "readState"
      ? `Nothing after your read position in spaces active in the last ${lookbackDays} days.`
      : `Nothing unread from the last ${lookbackDays} days. Muted spaces aren't counted.`
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
          <List.Dropdown.Item title="Unread only" value="unread" icon={Icon.Envelope} />
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
              ? "No unread messages"
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
          {sections.read.map((row) => (
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
