import { List, Detail, Action, ActionPanel, Icon, Color, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchPRsWithActivity } from "./api";
import { loadSeen, saveSeen, markItemSeen, markPRSeen, markAllSeen } from "./seen";
import { loadCachedPRs, saveCachedPRs } from "./cache";
import { getDemoPRs } from "./demo-data";
import {
  loadEventFilters,
  saveEventFilters,
  defaultFilters,
  ALL_ACTIVITY_TYPES,
  type EventFilters,
} from "./event-filters";
import { getUnseenActivity, getAllActivity, renderActivityMarkdown, renderPRSummaryMarkdown } from "./utils";
import type { ActivityItem, PRWithActivity, SeenMap } from "./types";
import { prKey } from "./types";

// ─── Review state → color mapping ───────────────────────────────────────────

const STATE_COLOR: Record<string, Color> = {
  APPROVED: Color.Green,
  CHANGES_REQUESTED: Color.Red,
  COMMENTED: Color.Yellow,
  DISMISSED: Color.SecondaryText,
  PENDING: Color.Blue,
};

const STATE_ICON: Record<string, Icon> = {
  APPROVED: Icon.Checkmark,
  CHANGES_REQUESTED: Icon.XMarkCircle,
  COMMENTED: Icon.Bubble,
  DISMISSED: Icon.MinusCircle,
  PENDING: Icon.Clock,
};

// ─── Determine if a review_comment is a reply ────────────────────────────────

function isReplyComment(item: ActivityItem, pr: PRWithActivity): boolean {
  if (item.type !== "review_comment") return false;

  // Explicit reply chain
  if (item.inReplyToId) return true;

  // Heuristic: another review comment exists on the same path+line that was
  // created before this one — this comment is part of a conversation thread
  if (item.path) {
    const earlier = pr.reviewComments.find(
      (c) =>
        c.id !== item.id &&
        c.path === item.path &&
        (c.line ?? c.original_line) === item.line &&
        new Date(c.created_at).getTime() < new Date(item.date).getTime(),
    );
    if (earlier) return true;
  }

  return false;
}

// ─── Main command ────────────────────────────────────────────────────────────

export default function UnreadUpdates() {
  const [seenMap, setSeenMap] = useState<SeenMap>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [displayPrs, setDisplayPrs] = useState<PRWithActivity[] | undefined>(undefined);
  const [demoMode, setDemoMode] = useState(false);
  const [demoSeenMap, setDemoSeenMap] = useState<SeenMap>({});
  const [eventFilters, setEventFilters] = useState<EventFilters>(defaultFilters());

  // Load cached PRs, seen state, and event filters on mount
  useEffect(() => {
    Promise.all([loadCachedPRs(), loadSeen(), loadEventFilters()]).then(([cached, seen, filters]) => {
      setSeenMap(seen);
      setEventFilters(filters);
      if (cached) {
        setDisplayPrs(cached);
        const allCollapsed: Record<string, boolean> = {};
        for (const pr of cached) allCollapsed[prKey(pr)] = true;
        setCollapsed(allCollapsed);
      }
    });
  }, []);

  const { isLoading, revalidate, error } = usePromise(async () => {
    const fetchedPrs = await fetchPRsWithActivity();
    // Load seen state after the fetch so marks made during the fetch aren't overwritten
    const fetchedSeen = await loadSeen();
    // Prune seen entries for PRs no longer in the open set
    const activePrKeys = new Set(fetchedPrs.map((pr) => prKey(pr)));
    for (const key of Object.keys(fetchedSeen)) {
      if (!activePrKeys.has(key)) delete fetchedSeen[key];
    }
    await saveSeen(fetchedSeen);
    setSeenMap(fetchedSeen);
    await saveCachedPRs(fetchedPrs);

    setDisplayPrs(fetchedPrs);
    // Preserve existing collapsed state; default new PRs to collapsed
    setCollapsed((prev) => {
      const updated: Record<string, boolean> = {};
      for (const pr of fetchedPrs) {
        const key = prKey(pr);
        updated[key] = prev[key] !== undefined ? prev[key] : true;
      }
      return updated;
    });
  });

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch PR data",
        message: error.message,
      });
    }
  }, [error]);

  const activePrs = demoMode ? getDemoPRs() : displayPrs;
  const activeSeenMap = demoMode ? demoSeenMap : seenMap;

  const prsWithUnseen = (activePrs ?? [])
    .map((pr) => ({
      pr,
      unseen: getUnseenActivity(pr, activeSeenMap[prKey(pr)]).filter((item) => eventFilters[item.type]),
    }))
    .filter(({ unseen }) => unseen.length > 0)
    .sort((a, b) => {
      const aDate = a.unseen[0]?.date ?? "";
      const bDate = b.unseen[0]?.date ?? "";
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  const toggleCollapse = (pr: PRWithActivity) => {
    const key = prKey(pr);
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    prsWithUnseen.forEach(({ pr }) => {
      all[prKey(pr)] = true;
    });
    setCollapsed(all);
  };

  const expandAll = () => {
    setCollapsed({});
  };

  const handleMarkItemSeen = async (pr: PRWithActivity, item: ActivityItem) => {
    if (demoMode) {
      setDemoSeenMap((prev) => {
        const key = prKey(pr);
        const existing = prev[key] ?? {
          lastSeen: new Date().toISOString(),
          seenItemIds: [],
        };
        return {
          ...prev,
          [key]: {
            ...existing,
            seenItemIds: [...existing.seenItemIds, item.itemKey],
          },
        };
      });
      return;
    }
    const updated = await markItemSeen(pr, item);
    setSeenMap(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Item marked as seen",
    });
  };

  const handleMarkPRSeen = async (pr: PRWithActivity) => {
    if (demoMode) {
      setDemoSeenMap((prev) => {
        const key = prKey(pr);
        const allItems = getAllActivity(pr);
        return {
          ...prev,
          [key]: {
            lastSeen: new Date().toISOString(),
            seenItemIds: allItems.map((i) => i.itemKey),
          },
        };
      });
      return;
    }
    const updated = await markPRSeen(pr);
    setSeenMap(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "PR marked as caught up",
    });
  };

  const handleMarkAllSeen = async () => {
    if (demoMode) {
      const demoPrs = getDemoPRs();
      const newMap: SeenMap = {};
      for (const pr of demoPrs) {
        const allItems = getAllActivity(pr);
        newMap[prKey(pr)] = {
          lastSeen: new Date().toISOString(),
          seenItemIds: allItems.map((i) => i.itemKey),
        };
      }
      setDemoSeenMap(newMap);
      return;
    }
    if (!displayPrs) return;
    const updated = await markAllSeen(displayPrs);
    setSeenMap(updated);
    await showToast({ style: Toast.Style.Success, title: "All caught up!" });
  };

  const toggleDemoMode = () => {
    setDemoMode((prev) => {
      const next = !prev;
      if (next) {
        setDisplayPrs(getDemoPRs());
        setDemoSeenMap({});
        setCollapsed({});
      } else {
        setDisplayPrs(undefined);
        revalidate();
      }
      return next;
    });
  };

  const handleToggleFilter = async (type: ActivityItem["type"]) => {
    const updated = { ...eventFilters, [type]: !eventFilters[type] };
    setEventFilters(updated);
    await saveEventFilters(updated);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter PR updates…">
      {prsWithUnseen.length === 0 && !isLoading && !demoMode && (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="All caught up!"
          description="No unread PR updates"
          actions={
            <ActionPanel>
              <Action
                title="Demo Mode"
                icon={Icon.Wand}
                shortcut={{
                  modifiers: ["cmd", "opt", "ctrl", "shift"],
                  key: "d",
                }}
                onAction={toggleDemoMode}
              />
            </ActionPanel>
          }
        />
      )}

      {prsWithUnseen.map(({ pr, unseen }) => {
        const key = prKey(pr);
        const isCollapsed = !!collapsed[key];
        const repoShort = pr.repo.split("/").pop() ?? pr.repo;

        return (
          <List.Section
            key={key}
            title={`#${pr.number} — ${pr.title}`}
            subtitle={`${repoShort} · ${unseen.length} update${unseen.length !== 1 ? "s" : ""} · by ${pr.user.login}`}
          >
            <List.Item
              key={`toggle-${key}`}
              icon={{
                source: isCollapsed ? Icon.ChevronRight : Icon.ChevronDown,
                tintColor: Color.SecondaryText,
              }}
              title={isCollapsed ? `Show ${unseen.length} update${unseen.length !== 1 ? "s" : ""}…` : "Hide updates"}
              accessories={[
                ...(isCollapsed ? unseenSummaryAccessories(unseen, pr) : []),
                { text: formatTimeAgo(unseen[0]?.date ?? pr.updated_at) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={isCollapsed ? "Expand" : "Collapse"}
                    icon={isCollapsed ? Icon.ChevronDown : Icon.ChevronRight}
                    onAction={() => toggleCollapse(pr)}
                  />
                  <Action.Push title="View PR Summary" icon={Icon.List} target={<PRSummaryDetail pr={pr} />} />
                  <Action.OpenInBrowser title="Open PR on GitHub" url={pr.html_url} />
                  <Action
                    title="Mark PR as Caught up"
                    icon={Icon.Checkmark}
                    shortcut={Keyboard.Shortcut.Common.Save}
                    onAction={() => handleMarkPRSeen(pr)}
                  />
                  <Action
                    title="Mark All as Caught up"
                    icon={Icon.CheckCircle}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "s" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                    }}
                    onAction={handleMarkAllSeen}
                  />
                  <Action
                    title={Object.values(collapsed).some(Boolean) ? "Expand All" : "Collapse All"}
                    icon={Icon.AppWindowList}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "e" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "e" },
                    }}
                    onAction={Object.values(collapsed).some(Boolean) ? expandAll : collapseAll}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <Action
                    title={demoMode ? "Exit Demo Mode" : "Demo Mode"}
                    icon={Icon.Wand}
                    shortcut={{
                      modifiers: ["cmd", "opt", "ctrl", "shift"],
                      key: "d",
                    }}
                    onAction={toggleDemoMode}
                  />
                  <FilterSubmenu filters={eventFilters} onToggle={handleToggleFilter} />
                </ActionPanel>
              }
            />

            {!isCollapsed &&
              unseen.map((item) => (
                <ActivityListItem
                  key={item.itemKey}
                  item={item}
                  pr={pr}
                  onMarkItemSeen={() => handleMarkItemSeen(pr, item)}
                  onMarkPRSeen={() => handleMarkPRSeen(pr)}
                  onMarkAllSeen={handleMarkAllSeen}
                  onRefresh={revalidate}
                  demoMode={demoMode}
                  onToggleDemoMode={toggleDemoMode}
                  eventFilters={eventFilters}
                  onToggleFilter={handleToggleFilter}
                />
              ))}
          </List.Section>
        );
      })}
    </List>
  );
}

// ─── Build a compact summary of unseen types for collapsed view ──────────────

function unseenSummaryAccessories(unseen: ActivityItem[], pr: PRWithActivity) {
  const reviews = unseen.filter((i) => i.type === "review").length;
  const codeComments = unseen.filter((i) => i.type === "review_comment" && !isReplyComment(i, pr)).length;
  const replies = unseen.filter((i) => isReplyComment(i, pr)).length;
  const comments = unseen.filter((i) => i.type === "issue_comment").length;
  const labels = unseen.filter((i) => i.type === "label_added" || i.type === "label_removed").length;
  const commits = unseen.filter((i) => i.type === "push").length;
  const forcePushes = unseen.filter((i) => i.type === "force_push").length;
  const prOpened = unseen.filter((i) => i.type === "pr_opened").length;

  const tags: List.Item.Accessory[] = [];
  if (prOpened > 0) {
    tags.push({ tag: { value: "new PR", color: Color.Green } });
  }
  if (reviews > 0) {
    tags.push({
      tag: {
        value: `${reviews} review${reviews !== 1 ? "s" : ""}`,
        color: Color.Green,
      },
    });
  }
  if (codeComments > 0) {
    tags.push({
      tag: {
        value: `${codeComments} code comment${codeComments !== 1 ? "s" : ""}`,
        color: Color.Orange,
      },
    });
  }
  if (replies > 0) {
    tags.push({
      tag: {
        value: `${replies} repl${replies !== 1 ? "ies" : "y"}`,
        color: Color.Blue,
      },
    });
  }
  if (comments > 0) {
    tags.push({
      tag: {
        value: `${comments} comment${comments !== 1 ? "s" : ""}`,
        color: Color.Purple,
      },
    });
  }
  if (commits > 0) {
    tags.push({
      tag: {
        value: `${commits} commit${commits !== 1 ? "s" : ""}`,
        color: Color.Yellow,
      },
    });
  }
  if (forcePushes > 0) {
    tags.push({
      tag: {
        value: `${forcePushes} force push${forcePushes !== 1 ? "es" : ""}`,
        color: Color.Red,
      },
    });
  }
  if (labels > 0) {
    tags.push({
      tag: {
        value: `${labels} label change${labels !== 1 ? "s" : ""}`,
        color: Color.Magenta,
      },
    });
  }
  return tags;
}

// ─── Single activity row ─────────────────────────────────────────────────────

function ActivityListItem({
  item,
  pr,
  onMarkItemSeen,
  onMarkPRSeen,
  onMarkAllSeen,
  onRefresh,
  demoMode,
  onToggleDemoMode,
  eventFilters,
  onToggleFilter,
}: {
  item: ActivityItem;
  pr: PRWithActivity;
  onMarkItemSeen: () => void;
  onMarkPRSeen: () => void;
  onMarkAllSeen: () => void;
  onRefresh: () => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
  eventFilters: EventFilters;
  onToggleFilter: (type: ActivityItem["type"]) => void;
}) {
  const isReply = isReplyComment(item, pr);
  const isCodeComment = item.type === "review_comment" && !isReply;

  let subtitle: string;
  let icon: { source: Icon; tintColor: Color };

  if (item.type === "review") {
    subtitle = item.reviewState ?? "";
    icon = {
      source: STATE_ICON[item.reviewState ?? ""] ?? Icon.Bubble,
      tintColor: STATE_COLOR[item.reviewState ?? ""] ?? Color.PrimaryText,
    };
  } else if (isReply) {
    subtitle = `replied on ${item.path ?? "code"}`;
    icon = { source: Icon.ArrowRight, tintColor: Color.Blue };
  } else if (isCodeComment) {
    subtitle = item.path ?? "code comment";
    icon = { source: Icon.Pencil, tintColor: Color.Orange };
  } else if (item.type === "label_added") {
    subtitle = `added "${item.labelName}"`;
    icon = { source: Icon.Tag, tintColor: Color.Magenta };
  } else if (item.type === "label_removed") {
    subtitle = `removed "${item.labelName}"`;
    icon = { source: Icon.Tag, tintColor: Color.SecondaryText };
  } else if (item.type === "push") {
    subtitle = item.commitSha?.slice(0, 7) ?? "commit";
    icon = { source: Icon.CodeBlock, tintColor: Color.Yellow };
  } else if (item.type === "force_push") {
    subtitle = "force pushed";
    icon = { source: Icon.Warning, tintColor: Color.Red };
  } else if (item.type === "pr_opened") {
    subtitle = "opened this PR";
    icon = { source: Icon.Plus, tintColor: Color.Green };
  } else {
    subtitle = "comment";
    icon = { source: Icon.Bubble, tintColor: Color.Purple };
  }

  // Timestamp — always show, keep body preview very short to avoid truncation
  const dateStr = item.date || pr.updated_at;
  const timeAgo = dateStr ? formatTimeAgo(dateStr) : "";

  return (
    <List.Item
      icon={icon}
      title={item.user.login}
      subtitle={subtitle}
      accessories={[
        ...(item.body ? [{ text: truncate(item.body, 30) }] : []),
        { tag: { value: timeAgo, color: Color.SecondaryText } },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="View Details" icon={Icon.Eye} target={<ActivityDetail item={item} pr={pr} />} />
          <Action.OpenInBrowser title="Open on GitHub" url={item.htmlUrl} />
          <Action
            title="Mark This Item as Seen"
            icon={Icon.EyeDropper}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
            onAction={onMarkItemSeen}
          />
          <Action
            title="Mark Entire PR as Caught up"
            icon={Icon.Checkmark}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={onMarkPRSeen}
          />
          <Action
            title="Mark All as Caught up"
            icon={Icon.CheckCircle}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "s" },
              Windows: { modifiers: ["ctrl", "shift"], key: "s" },
            }}
            onAction={onMarkAllSeen}
          />
          <Action.Push title="View PR Summary" icon={Icon.List} target={<PRSummaryDetail pr={pr} />} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          <Action
            title={demoMode ? "Exit Demo Mode" : "Demo Mode"}
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd", "opt", "ctrl", "shift"], key: "d" }}
            onAction={onToggleDemoMode}
          />
          <FilterSubmenu filters={eventFilters} onToggle={onToggleFilter} />
        </ActionPanel>
      }
    />
  );
}

// ─── Detail views ────────────────────────────────────────────────────────────

function ActivityDetail({ item, pr }: { item: ActivityItem; pr: PRWithActivity }) {
  const markdown = renderActivityMarkdown(item, pr.reviewComments);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`#${pr.number} — ${item.user.login}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on GitHub" url={item.htmlUrl} />
          <Action.CopyToClipboard title="Copy Comment" content={item.body} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Author" text={item.user.login} />
          <Detail.Metadata.Label title="Date" text={item.date ? new Date(item.date).toLocaleString() : "Unknown"} />
          <Detail.Metadata.Label
            title="Type"
            text={
              item.type === "pr_opened"
                ? "PR opened"
                : item.type === "push"
                  ? "commit"
                  : item.type === "force_push"
                    ? "force push"
                    : item.type === "label_added"
                      ? "label added"
                      : item.type === "label_removed"
                        ? "label removed"
                        : isReplyComment(item, pr)
                          ? "reply"
                          : item.type === "review_comment"
                            ? "code comment"
                            : item.type.replace("_", " ")
            }
          />
          {item.reviewState && (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={item.reviewState}
                color={STATE_COLOR[item.reviewState] ?? Color.PrimaryText}
              />
            </Detail.Metadata.TagList>
          )}
          {item.path && <Detail.Metadata.Label title="File" text={item.path} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="GitHub" text="Open in browser" target={item.htmlUrl} />
        </Detail.Metadata>
      }
    />
  );
}

function PRSummaryDetail({ pr }: { pr: PRWithActivity }) {
  const { data: seenMap } = usePromise(loadSeen);
  const unseen = getUnseenActivity(pr, seenMap?.[prKey(pr)]);
  const markdown = renderPRSummaryMarkdown(pr, unseen);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`#${pr.number} — ${pr.title}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open PR on GitHub" url={pr.html_url} />
        </ActionPanel>
      }
    />
  );
}

// ─── Event filter submenu ─────────────────────────────────────────────────────

function FilterSubmenu({
  filters,
  onToggle,
}: {
  filters: EventFilters;
  onToggle: (type: ActivityItem["type"]) => void;
}) {
  return (
    <ActionPanel.Submenu title="Event Filters" icon={Icon.Filter}>
      {ALL_ACTIVITY_TYPES.map(({ type, label }) => (
        <Action
          key={type}
          title={label}
          icon={filters[type] ? Icon.CheckCircle : Icon.Circle}
          onAction={() => onToggle(type)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

// ─── Tiny helpers ────────────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  const clean = str.replace(/\n/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
