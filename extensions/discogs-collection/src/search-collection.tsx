import { Action, ActionPanel, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useMemo, useState } from "react";
import { ReleaseDetailView } from "./release-detail";
import { CollectionItem } from "./types";
import { useCollection } from "./use-collection";

const FORMAT_OPTIONS = ["All Formats", "Vinyl", "CD", "Cassette", "Digital", "Other"] as const;
type FormatFilter = (typeof FORMAT_OPTIONS)[number];

const SORT_OPTIONS = ["Recently Added", "Title A–Z", "Artist A–Z", "Year (Newest)", "Year (Oldest)"] as const;
type SortOrder = (typeof SORT_OPTIONS)[number];

function sortItems(items: CollectionItem[], order: SortOrder): CollectionItem[] {
  const sorted = [...items];
  switch (order) {
    case "Recently Added":
      return sorted.sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime());
    case "Title A–Z":
      return sorted.sort((a, b) => a.basic_information.title.localeCompare(b.basic_information.title));
    case "Artist A–Z":
      return sorted.sort((a, b) => artistNames(a).localeCompare(artistNames(b)));
    case "Year (Newest)":
      return sorted.sort((a, b) => (b.basic_information.year || 0) - (a.basic_information.year || 0));
    case "Year (Oldest)":
      return sorted.sort((a, b) => (a.basic_information.year || 0) - (b.basic_information.year || 0));
  }
}

const FORMAT_ICONS: Record<FormatFilter, string> = {
  "All Formats": "🎵",
  Vinyl: "🖤",
  CD: "💿",
  Cassette: "📼",
  Digital: "📁",
  Other: "📦",
};

function formatFallbackIcon(formatName: string): Icon {
  const lower = formatName.toLowerCase();
  if (lower.includes("vinyl")) return Icon.Music;
  if (lower.includes("cd")) return Icon.CircleProgress100;
  if (lower.includes("cassette")) return Icon.Rewind;
  if (lower.includes("digital") || lower.includes("file")) return Icon.Download;
  return Icon.Dot;
}

function primaryFormat(item: CollectionItem): string {
  return item.basic_information.formats[0]?.name ?? "Unknown";
}

function matchesFormatFilter(item: CollectionItem, filter: FormatFilter): boolean {
  if (filter === "All Formats") return true;
  const formats = item.basic_information.formats.map((f) => f.name.toLowerCase());
  if (filter === "Vinyl") return formats.some((f) => f.includes("vinyl"));
  if (filter === "CD") return formats.some((f) => f === "cd" || f.includes("cd"));
  if (filter === "Cassette") return formats.some((f) => f.includes("cassette"));
  if (filter === "Digital") return formats.some((f) => f.includes("digital") || f.includes("file"));
  return !formats.some((f) => ["vinyl", "cd", "cassette", "digital", "file"].some((k) => f.includes(k)));
}

function artistNames(item: CollectionItem): string {
  return item.basic_information.artists.map((a) => a.name.replace(/\s*\(\d+\)$/, "")).join(", ");
}

export default function SearchCollection() {
  const { items, isLoading, error, refresh } = useCollection();
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("All Formats");
  const [sortOrder, setSortOrder] = useState<SortOrder>("Recently Added");

  const filtered = useMemo(
    () =>
      sortItems(
        items.filter((item) => matchesFormatFilter(item, formatFilter)),
        sortOrder
      ),
    [items, formatFilter, sortOrder]
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load collection"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by title, artist, label, genre…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by format"
          value={formatFilter}
          onChange={(v) => setFormatFilter(v as FormatFilter)}
        >
          {FORMAT_OPTIONS.map((f) => (
            <List.Dropdown.Item key={f} title={f} value={f} icon={FORMAT_ICONS[f]} />
          ))}
        </List.Dropdown>
      }
      isShowingDetail={false}
    >
      {!isLoading && filtered.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No records found"
          description="Try a different search or format filter."
        />
      )}
      {filtered.map((item) => {
        const info = item.basic_information;
        const artist = artistNames(item);
        const format = primaryFormat(item);
        const year = info.year ? String(info.year) : "";
        const label = info.labels[0]?.name ?? "";
        const subtitle = [artist, year].filter(Boolean).join(" · ");
        const accessory = label ? { text: label } : undefined;

        const artworkIcon = info.thumb
          ? { source: info.thumb, fallback: formatFallbackIcon(format) }
          : formatFallbackIcon(format);

        return (
          <List.Item
            key={item.instance_id}
            icon={artworkIcon}
            title={info.title}
            subtitle={subtitle}
            accessories={accessory ? [accessory] : undefined}
            keywords={[artist, label, format, ...(info.genres ?? []), ...(info.styles ?? []), year].filter(Boolean)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.List}
                  target={<ReleaseDetailView releaseId={info.id} basicInfo={info} />}
                />
                <Action.OpenInBrowser
                  title="Open in Discogs"
                  url={`https://www.discogs.com/release/${info.id}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={`${artist} — ${info.title}`}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                <ActionPanel.Section title="Sort">
                  {SORT_OPTIONS.map((option) => (
                    <Action
                      key={option}
                      title={option}
                      icon={sortOrder === option ? Icon.CheckCircle : Icon.Circle}
                      shortcut={option === SORT_OPTIONS[0] ? { modifiers: ["cmd"], key: "s" } : undefined}
                      onAction={() => setSortOrder(option)}
                    />
                  ))}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh Collection"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => {
                      refresh();
                      showToast({ style: Toast.Style.Animated, title: "Refreshing collection…" });
                    }}
                  />
                  <Action
                    title="Open Preferences"
                    icon={Icon.Gear}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
