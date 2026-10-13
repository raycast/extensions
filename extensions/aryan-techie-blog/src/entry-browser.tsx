import { Action, ActionPanel, Color, Detail, Grid, Icon, Keyboard, List } from "@raycast/api";
import { getFavicon, useLocalStorage } from "@raycast/utils";
import { useMemo, useState } from "react";
import { BLOG_URL, Entry, EntryKind, WORK_URL } from "./feed";

type Layout = "list" | "grid";

const KINDS = {
  post: {
    noun: "posts",
    tagLabel: "Topic",
    tagsTitle: "Topics",
    groupBy: "month",
    homeTitle: "Open Blog",
    homeUrl: BLOG_URL,
  },
  project: {
    noun: "projects",
    tagLabel: "Tech",
    tagsTitle: "Stack",
    groupBy: "year",
    homeTitle: "Open Portfolio",
    homeUrl: WORK_URL,
  },
} as const;

export interface UnreadState {
  ids: Set<string>;
  markRead: (ids: string[]) => Promise<void>;
  markUnread: (ids: string[]) => Promise<void>;
}

export interface SavedState {
  ids: string[];
  setSaved: (id: string, saved: boolean) => Promise<void>;
}

interface EntryBrowserProps {
  kind: EntryKind;
  entries: Entry[];
  isLoading: boolean;
  onRefresh: () => void;
  /** Enables new/read tracking. Only blog posts use it. */
  unread?: UnreadState;
  /** Enables the reading list. Only blog posts use it. */
  saved?: SavedState;
  /** Reading time in minutes, keyed by entry id. */
  readingTimes?: Record<string, number>;
}

interface EntryState {
  unread?: UnreadState;
  saved?: SavedState;
  minutes?: number;
}

// Topic values get a prefix, so a topic named like a built-in filter cannot collide with it.
const ALL_FILTER = "filter:all";
const SAVED_FILTER = "filter:reading-list";
const TOPIC_PREFIX = "topic:";

interface ViewControls {
  layout: Layout;
  toggleLayout: () => void;
  showDetail: boolean;
  toggleDetail: () => void;
  onRefresh: () => void;
}

/** Shared list/grid browser for blog posts and projects. */
export function EntryBrowser({
  kind,
  entries,
  isLoading,
  onRefresh,
  unread,
  saved,
  readingTimes = {},
}: EntryBrowserProps) {
  const config = KINDS[kind];
  const [filter, setFilter] = useState(ALL_FILTER);
  const [showDetail, setShowDetail] = useState(true);
  const {
    value: layout = "list",
    setValue: setLayout,
    isLoading: isLoadingLayout,
  } = useLocalStorage<Layout>(`layout-${kind}`, "list");

  const filters = useMemo(() => [...new Set(entries.flatMap((entry) => entry.categories))].sort(), [entries]);
  const visible =
    filter === ALL_FILTER
      ? entries
      : filter === SAVED_FILTER
        ? entries.filter((entry) => saved?.ids.includes(entry.id))
        : entries.filter((entry) => entry.categories.includes(filter.slice(TOPIC_PREFIX.length)));
  const sections = groupByDate(visible, config.groupBy);

  const controls: ViewControls = {
    layout,
    toggleLayout: () => setLayout(layout === "list" ? "grid" : "list"),
    showDetail,
    toggleDetail: () => setShowDetail((value) => !value),
    onRefresh,
  };
  const searchBarPlaceholder = `Search ${config.noun} by title or ${config.tagLabel.toLowerCase()}`;
  const filterTooltip = `Filter by ${config.tagLabel}`;
  const allTitle = `All ${config.tagsTitle}`;
  const emptyActions = (
    <ActionPanel>
      <Action.OpenInBrowser title={config.homeTitle} url={config.homeUrl} />
    </ActionPanel>
  );
  const emptyView =
    filter === SAVED_FILTER
      ? {
          icon: Icon.Bookmark,
          title: "Your reading list is empty",
          description: "Press ⌘S on a post to save it for later.",
        }
      : { icon: Icon.Document, title: `No ${config.noun} found` };
  const stateFor = (entry: Entry): EntryState => ({ unread, saved, minutes: readingTimes[entry.id] });

  if (layout === "grid") {
    return (
      <Grid
        isLoading={isLoading || isLoadingLayout}
        columns={3}
        aspectRatio="16/9"
        fit={Grid.Fit.Fill}
        searchBarPlaceholder={searchBarPlaceholder}
        searchBarAccessory={
          <Grid.Dropdown tooltip={filterTooltip} storeValue onChange={setFilter}>
            <Grid.Dropdown.Item title={allTitle} value={ALL_FILTER} />
            {saved && <Grid.Dropdown.Item title="Reading List" value={SAVED_FILTER} icon={Icon.Bookmark} />}
            <Grid.Dropdown.Section>
              {filters.map((name) => (
                <Grid.Dropdown.Item key={name} title={name} value={TOPIC_PREFIX + name} />
              ))}
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
        }
      >
        <Grid.EmptyView {...emptyView} actions={emptyActions} />
        {sections.map((section) => (
          <Grid.Section key={section.title} title={section.title} subtitle={String(section.entries.length)}>
            {section.entries.map((entry) => {
              const minutes = readingTimes[entry.id];
              return (
                <Grid.Item
                  key={entry.id}
                  content={entry.coverImage ? { source: entry.coverImage } : Icon.Document}
                  title={entry.title}
                  subtitle={[entry.date && formatDate(entry.date), minutes && `${minutes} min read`]
                    .filter(Boolean)
                    .join(" · ")}
                  keywords={keywordsFor(entry)}
                  accessory={
                    unread?.ids.has(entry.id)
                      ? { icon: { source: Icon.Dot, tintColor: Color.Blue }, tooltip: "New" }
                      : saved?.ids.includes(entry.id)
                        ? { icon: Icon.Bookmark, tooltip: "In Reading List" }
                        : undefined
                  }
                  actions={<EntryActions entry={entry} state={stateFor(entry)} controls={controls} />}
                />
              );
            })}
          </Grid.Section>
        ))}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingLayout}
      isShowingDetail={showDetail && visible.length > 0}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={
        <List.Dropdown tooltip={filterTooltip} storeValue onChange={setFilter}>
          <List.Dropdown.Item title={allTitle} value={ALL_FILTER} />
          {saved && <List.Dropdown.Item title="Reading List" value={SAVED_FILTER} icon={Icon.Bookmark} />}
          <List.Dropdown.Section>
            {filters.map((name) => (
              <List.Dropdown.Item key={name} title={name} value={TOPIC_PREFIX + name} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView {...emptyView} actions={emptyActions} />
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={String(section.entries.length)}>
          {section.entries.map((entry) => {
            const isNew = unread?.ids.has(entry.id) ?? false;
            const isSaved = saved?.ids.includes(entry.id) ?? false;
            const minutes = readingTimes[entry.id];
            return (
              <List.Item
                key={entry.id}
                icon={isNew ? { source: Icon.Dot, tintColor: Color.Blue } : isSaved ? Icon.Bookmark : Icon.Document}
                title={entry.title}
                keywords={keywordsFor(entry)}
                accessories={
                  showDetail
                    ? undefined
                    : [
                        ...(isNew ? [{ tag: { value: "New", color: Color.Blue } }] : []),
                        ...entry.categories.slice(0, 3).map((name) => ({ tag: name })),
                        ...(minutes
                          ? [{ icon: Icon.Clock, text: `${minutes} min`, tooltip: `${minutes} min read` }]
                          : []),
                        ...(entry.date ? [{ date: entry.date, tooltip: formatDate(entry.date) }] : []),
                      ]
                }
                detail={
                  <List.Item.Detail
                    markdown={entryMarkdown(entry)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        {entry.date && (
                          <List.Item.Detail.Metadata.Label title="Published" text={formatDate(entry.date)} />
                        )}
                        {!!minutes && (
                          <List.Item.Detail.Metadata.Label
                            title="Reading Time"
                            text={`${minutes} min read`}
                            icon={Icon.Clock}
                          />
                        )}
                        {entry.categories.length > 0 && (
                          <List.Item.Detail.Metadata.TagList title={config.tagsTitle}>
                            {entry.categories.map((name) => (
                              <List.Item.Detail.Metadata.TagList.Item key={name} text={name} />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        )}
                        <List.Item.Detail.Metadata.Link
                          title="Link"
                          text="Read on aryantechie.com"
                          target={entry.url}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={<EntryActions entry={entry} state={stateFor(entry)} controls={controls} />}
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

/**
 * Full-screen details, pushed from the grid layout, which has no side panel.
 * A pushed view keeps the props it was pushed with, so it mirrors the read and
 * saved state locally to keep its actions in sync.
 */
function EntryDetail({ entry, state }: { entry: Entry; state: EntryState }) {
  const config = KINDS[entry.kind];
  const { unread, saved, minutes } = state;
  const [unreadIds, setUnreadIds] = useState(unread?.ids ?? new Set<string>());
  const [savedIds, setSavedIds] = useState(saved?.ids ?? []);

  const localState: EntryState = {
    minutes,
    unread: unread && {
      ids: unreadIds,
      markRead: async (ids) => {
        setUnreadIds((current) => new Set([...current].filter((id) => !ids.includes(id))));
        await unread.markRead(ids);
      },
      markUnread: async (ids) => {
        setUnreadIds((current) => new Set([...current, ...ids]));
        await unread.markUnread(ids);
      },
    },
    saved: saved && {
      ids: savedIds,
      setSaved: async (id, save) => {
        setSavedIds((current) => (save ? [id, ...current] : current.filter((savedId) => savedId !== id)));
        await saved.setSaved(id, save);
      },
    },
  };

  return (
    <Detail
      navigationTitle={entry.title}
      markdown={entryMarkdown(entry)}
      metadata={
        <Detail.Metadata>
          {entry.date && <Detail.Metadata.Label title="Published" text={formatDate(entry.date)} />}
          {!!minutes && <Detail.Metadata.Label title="Reading Time" text={`${minutes} min read`} icon={Icon.Clock} />}
          {entry.categories.length > 0 && (
            <Detail.Metadata.TagList title={config.tagsTitle}>
              {entry.categories.map((name) => (
                <Detail.Metadata.TagList.Item key={name} text={name} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Link title="Link" text="Read on aryantechie.com" target={entry.url} />
        </Detail.Metadata>
      }
      actions={<EntryActions entry={entry} state={localState} />}
    />
  );
}

function EntryActions({ entry, state, controls }: { entry: Entry; state: EntryState; controls?: ViewControls }) {
  const config = KINDS[entry.kind];
  const { unread, saved } = state;
  const isNew = unread?.ids.has(entry.id) ?? false;
  const isSaved = saved?.ids.includes(entry.id) ?? false;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={entry.url} onOpen={() => isNew && unread?.markRead([entry.id])} />
        {controls?.layout === "grid" && (
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            target={<EntryDetail entry={entry} state={state} />}
          />
        )}
        {saved && (
          <Action
            title={isSaved ? "Remove from Reading List" : "Save to Reading List"}
            icon={isSaved ? Icon.MinusCircle : Icon.Bookmark}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={() => saved.setSaved(entry.id, !isSaved)}
          />
        )}
        <Action.CopyToClipboard title="Copy Link" content={entry.url} />
        <Action.CopyToClipboard
          title="Copy as Markdown Link"
          content={`[${entry.title}](${entry.url})`}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard
          title="Copy as Rich Link"
          content={{
            html: `<a href="${escapeHtml(entry.url)}">${escapeHtml(entry.title)}</a>`,
            text: `${entry.title} ${entry.url}`,
          }}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <ActionPanel.Submenu title="Share" icon={Icon.Upload} shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}>
          <Action.OpenInBrowser
            title="Share on X"
            icon={getFavicon("https://x.com")}
            url={`https://x.com/intent/post?text=${encodeURIComponent(entry.title)}&url=${encodeURIComponent(entry.url)}`}
          />
          <Action.OpenInBrowser
            title="Share on LinkedIn"
            icon={getFavicon("https://www.linkedin.com")}
            url={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(entry.url)}`}
          />
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      {unread && (
        <ActionPanel.Section>
          {isNew ? (
            <Action
              title="Mark as Read"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => unread.markRead([entry.id])}
            />
          ) : (
            <Action
              title="Mark as Unread"
              icon={Icon.Circle}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => unread.markUnread([entry.id])}
            />
          )}
          {unread.ids.size > 0 && (
            <Action
              title="Mark All as Read"
              icon={Icon.CheckList}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={() => unread.markRead([...unread.ids])}
            />
          )}
        </ActionPanel.Section>
      )}
      {controls && (
        <ActionPanel.Section>
          {controls.layout === "list" && (
            <Action
              title={controls.showDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={controls.toggleDetail}
            />
          )}
          <Action
            title={controls.layout === "list" ? "Switch to Grid View" : "Switch to List View"}
            icon={controls.layout === "list" ? Icon.AppWindowGrid3x3 : Icon.List}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            onAction={controls.toggleLayout}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={controls.onRefresh}
          />
          <Action.OpenInBrowser
            title={config.homeTitle}
            url={config.homeUrl}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

/** Escapes feed text so it renders as plain text, not as Markdown links, images or HTML. */
function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|<>~]/g, "\\$&");
}

function coverImageMarkdown(entry: Entry): string {
  if (!entry.coverImage) return "";
  const url = new URL(entry.coverImage);
  url.searchParams.set("raycast-width", "480");
  // Parentheses and spaces would end the Markdown link target early.
  const target = url.href.replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/ /g, "%20");
  return `![${escapeMarkdown(entry.title)}](${target})`;
}

function entryMarkdown(entry: Entry): string {
  return [
    coverImageMarkdown(entry),
    `## ${escapeMarkdown(entry.title)}`,
    entry.summary ? `*${escapeMarkdown(entry.summary)}*` : "",
    ...entry.excerpt.split(/\n+/).map(escapeMarkdown),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function keywordsFor(entry: Entry): string[] {
  return [...entry.categories, ...entry.summary.split(/\s+/).slice(0, 30)];
}

/** Feed dates are midnight UTC, so format in UTC to avoid showing the day before. */
export function formatDate(date: Date, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string {
  return date.toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

/** Groups entries (already sorted newest first) into "September 2026" or "2026" sections. */
function groupByDate(entries: Entry[], unit: "month" | "year"): { title: string; entries: Entry[] }[] {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const title = entry.date
      ? formatDate(entry.date, unit === "month" ? { month: "long", year: "numeric" } : { year: "numeric" })
      : "Undated";
    groups.set(title, [...(groups.get(title) ?? []), entry]);
  }
  return [...groups].map(([title, items]) => ({ title, entries: items }));
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
