import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Image,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ReactNode, useState } from "react";
import { parseFeeds } from "./lib/feeds";
import { fetchAllFeeds } from "./lib/fetch";
import { hasKeyword, parseKeywords } from "./lib/score";
import { NewsItem, Severity } from "./lib/types";
import { matchWatch, parseWatchlist } from "./lib/watchlist";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];
const TOP_N = 5;

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "⚪",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const COPY_SHORTCUT: Keyboard.Shortcut = {
  modifiers: ["cmd", "shift"],
  key: "c",
};
const RELOAD_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd"], key: "r" };
const FORWARD_SHORTCUT: Keyboard.Shortcut = {
  modifiers: ["cmd"],
  key: "arrowRight",
};
const BACK_SHORTCUT: Keyboard.Shortcut = {
  modifiers: ["cmd"],
  key: "arrowLeft",
};
const SHOW_ALL_SHORTCUT: Keyboard.Shortcut = {
  modifiers: ["cmd", "shift"],
  key: "a",
};

// Neutralize markdown so untrusted feed text cannot inject images/links/HTML
// when rendered in a Detail view or copied as markdown.
function mdSafe(s: string): string {
  return s.replace(/[[\]`<>!\\*_]/g, "\\$&");
}

function buildMarkdown(items: NewsItem[]): string {
  const lines = [`# Security News — ${new Date().toLocaleString()}`];
  for (const severity of SEVERITY_ORDER) {
    const tier = items.filter((i) => i.severity === severity);
    if (tier.length === 0) continue;
    lines.push(
      "",
      `## ${SEVERITY_EMOJI[severity]} ${SEVERITY_LABEL[severity]}`,
    );
    for (const i of tier) {
      const title = mdSafe(i.title);
      lines.push(
        i.link
          ? `- [${title}](${i.link}) — ${i.source}`
          : `- ${title} — ${i.source}`,
      );
    }
  }
  return lines.join("\n");
}

type SortMode = "date" | "criticality";

// Order within a tier; tier order itself stays by severity.
function sortNews(arr: NewsItem[], mode: SortMode): NewsItem[] {
  return [...arr].sort(
    mode === "date"
      ? (a, b) => b.publishedAt - a.publishedAt
      : (a, b) => b.score - a.score || b.publishedAt - a.publishedAt,
  );
}

// Shared search-bar sort control. id+storeValue keep the choice consistent and
// persisted across the main view and the drilled-in tier view.
function SortDropdown({ onChange }: { onChange: (m: SortMode) => void }) {
  return (
    <List.Dropdown
      id="sort"
      tooltip="Sort within tier"
      storeValue
      onChange={(v) => onChange(v === "criticality" ? "criticality" : "date")}
    >
      <List.Dropdown.Item title="Newest first" value="date" />
      <List.Dropdown.Item title="By criticality" value="criticality" />
    </List.Dropdown>
  );
}

export default function Command() {
  const {
    feeds: feedsRaw,
    watchlist,
    extraCritical,
    extraHigh,
    extraMedium,
    denylist,
  } = getPreferenceValues<Preferences.LatestNews>();

  const [updatedAt, setUpdatedAt] = useState(0);
  const [sort, setSort] = useState<"date" | "criticality">("date");

  const { data, isLoading, revalidate } = useCachedPromise(
    (raw: string, ec: string, eh: string, em: string) =>
      fetchAllFeeds(parseFeeds(raw), {
        critical: parseKeywords(ec),
        high: parseKeywords(eh),
        medium: parseKeywords(em),
      }),
    [feedsRaw ?? "", extraCritical ?? "", extraHigh ?? "", extraMedium ?? ""],
    {
      initialData: [] as NewsItem[],
      onData: () => setUpdatedAt(Date.now()),
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load news",
          message: error.message,
        });
      },
    },
  );

  const deny = parseKeywords(denylist ?? "");
  const items =
    deny.length > 0
      ? data.filter((i) => !hasKeyword(`${i.title} ${i.summary}`, deny))
      : data;

  const sortItems = (arr: NewsItem[]) => sortNews(arr, sort);

  const sharedActions = (
    <>
      <Action.CopyToClipboard
        title="Copy List as Markdown"
        content={buildMarkdown(items)}
        shortcut={COPY_SHORTCUT}
      />
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={RELOAD_SHORTCUT}
        onAction={revalidate}
      />
    </>
  );

  const entries = parseWatchlist(watchlist ?? "");
  const watched =
    entries.length > 0
      ? sortItems(
          items.filter((item) =>
            matchWatch(`${item.title} ${item.summary}`, entries),
          ),
        )
      : [];

  const tiers = SEVERITY_ORDER.map((severity) => ({
    severity,
    items: sortItems(items.filter((item) => item.severity === severity)),
  })).filter((t) => t.items.length > 0);

  const [top, ...rest] = tiers;

  const navigationTitle = updatedAt
    ? `Cyber Security Pulse · updated ${new Date(updatedAt).toLocaleTimeString()}`
    : "Cyber Security Pulse";

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Filter security news…"
      searchBarAccessory={<SortDropdown onChange={setSort} />}
    >
      {watched.length > 0 ? (
        <List.Section title="⭐ Watched" subtitle={String(watched.length)}>
          {watched.map((item, index) => (
            <NewsListItem
              key={`watched-${item.link || item.title}-${index}`}
              item={item}
              icon={SEVERITY_EMOJI[item.severity]}
              extraActions={sharedActions}
              onReload={revalidate}
            />
          ))}
        </List.Section>
      ) : null}

      {top ? (
        <List.Section
          title={`${SEVERITY_EMOJI[top.severity]} ${SEVERITY_LABEL[top.severity]}`}
          subtitle={String(top.items.length)}
        >
          {top.items.slice(0, TOP_N).map((item, index) => (
            <NewsListItem
              key={`${item.link || item.title}-${index}`}
              item={item}
              extraActions={sharedActions}
              onReload={revalidate}
              showAll={{
                label: SEVERITY_LABEL[top.severity],
                target: (
                  <TierList
                    severity={top.severity}
                    items={top.items}
                    onReload={revalidate}
                    initialSort={sort}
                  />
                ),
              }}
            />
          ))}
          {top.items.length > TOP_N ? (
            <DrillRow
              tier={top}
              extraActions={sharedActions}
              onReload={revalidate}
              label={`Show all ${top.items.length} ${SEVERITY_LABEL[top.severity]}`}
              icon={Icon.Ellipsis}
              sort={sort}
            />
          ) : null}
        </List.Section>
      ) : null}

      {rest.length > 0 ? (
        <List.Section title="More">
          {rest.map((tier) => (
            <DrillRow
              key={tier.severity}
              tier={tier}
              extraActions={sharedActions}
              onReload={revalidate}
              label={`${SEVERITY_EMOJI[tier.severity]} ${SEVERITY_LABEL[tier.severity]}`}
              accessoryCount
              sort={sort}
            />
          ))}
        </List.Section>
      ) : null}

      <List.EmptyView
        title="No security news"
        description="Pull to reload or press ⌘R."
        icon={Icon.Shield}
      />
    </List>
  );
}

function DrillRow({
  tier,
  extraActions,
  onReload,
  label,
  icon,
  accessoryCount,
  sort,
}: {
  tier: { severity: Severity; items: NewsItem[] };
  extraActions: ReactNode;
  onReload: () => void;
  label: string;
  icon?: Icon;
  accessoryCount?: boolean;
  sort: SortMode;
}) {
  return (
    <List.Item
      icon={icon}
      title={label}
      accessories={
        accessoryCount
          ? [{ text: String(tier.items.length) }, { icon: Icon.ChevronRight }]
          : [{ icon: Icon.ChevronRight }]
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Show All"
            icon={Icon.List}
            shortcut={FORWARD_SHORTCUT}
            target={
              <TierList
                severity={tier.severity}
                items={tier.items}
                onReload={onReload}
                initialSort={sort}
              />
            }
          />
          {extraActions}
        </ActionPanel>
      }
    />
  );
}

function NewsListItem({
  item,
  extraActions,
  onReload,
  showBack,
  icon,
  showAll,
}: {
  item: NewsItem;
  extraActions: ReactNode;
  onReload: () => void;
  showBack?: boolean;
  icon?: Image.ImageLike;
  showAll?: { label: string; target: ReactNode };
}) {
  const { pop } = useNavigation();
  return (
    <List.Item
      icon={icon}
      title={item.title}
      accessories={[
        { tag: item.source },
        ...(item.publishedAt > 0 ? [{ date: new Date(item.publishedAt) }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Read Preview"
            icon={Icon.Eye}
            shortcut={FORWARD_SHORTCUT}
            target={<NewsDetail item={item} onReload={onReload} />}
          />
          {showAll ? (
            <Action.Push
              title={`Show All ${showAll.label}`}
              icon={Icon.List}
              shortcut={SHOW_ALL_SHORTCUT}
              target={showAll.target}
            />
          ) : null}
          {item.link ? <Action.OpenInBrowser url={item.link} /> : null}
          {showBack ? (
            <Action
              title="Back"
              icon={Icon.ArrowLeft}
              shortcut={BACK_SHORTCUT}
              onAction={pop}
            />
          ) : null}
          {extraActions}
        </ActionPanel>
      }
    />
  );
}

function TierList({
  severity,
  items,
  onReload,
  initialSort,
}: {
  severity: Severity;
  items: NewsItem[];
  onReload: () => void;
  initialSort: SortMode;
}) {
  const [sort, setSort] = useState<SortMode>(initialSort);
  const sorted = sortNews(items, sort);

  const sharedActions = (
    <>
      <Action.CopyToClipboard
        title="Copy List as Markdown"
        content={buildMarkdown(sorted)}
        shortcut={COPY_SHORTCUT}
      />
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={RELOAD_SHORTCUT}
        onAction={onReload}
      />
    </>
  );

  return (
    <List
      navigationTitle={`${SEVERITY_EMOJI[severity]} ${SEVERITY_LABEL[severity]} (${items.length})`}
      searchBarPlaceholder={`Filter ${SEVERITY_LABEL[severity].toLowerCase()} news…`}
      searchBarAccessory={<SortDropdown onChange={setSort} />}
    >
      {sorted.map((item, index) => (
        <NewsListItem
          key={`${item.link || item.title}-${index}`}
          item={item}
          extraActions={sharedActions}
          onReload={onReload}
          showBack
        />
      ))}
    </List>
  );
}

function NewsDetail({
  item,
  onReload,
}: {
  item: NewsItem;
  onReload: () => void;
}) {
  const { pop } = useNavigation();
  const date =
    item.publishedAt > 0
      ? new Date(item.publishedAt).toLocaleString()
      : "Unknown";
  const markdown = `# ${mdSafe(item.title)}\n\n${item.summary ? mdSafe(item.summary) : "_No preview available._"}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Source" text={item.source} />
          <Detail.Metadata.Label
            title="Severity"
            text={`${SEVERITY_EMOJI[item.severity]} ${SEVERITY_LABEL[item.severity]}`}
          />
          <Detail.Metadata.Label title="Score" text={String(item.score)} />
          <Detail.Metadata.Label title="Published" text={date} />
          {item.link ? (
            <Detail.Metadata.Link
              title="Article"
              target={item.link}
              text="Open"
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {item.link ? (
            <Action.OpenInBrowser url={item.link} shortcut={FORWARD_SHORTCUT} />
          ) : null}
          {item.link ? (
            <Action.CopyToClipboard title="Copy Link" content={item.link} />
          ) : null}
          <Action
            title="Back"
            icon={Icon.ArrowLeft}
            shortcut={BACK_SHORTCUT}
            onAction={pop}
          />
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            shortcut={RELOAD_SHORTCUT}
            onAction={onReload}
          />
        </ActionPanel>
      }
    />
  );
}
