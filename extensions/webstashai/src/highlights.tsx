import {
  Action,
  ActionPanel,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useCallback, useMemo, useState } from "react";
import { deleteHighlight, handleApiError, listHighlights } from "./api/client";
import { formatDate, getPageFavicon, isValidApiKey } from "./helpers/utils";
import type { HighlightWithPage } from "./types";

export default function HighlightsCommand() {
  const [urlFilter, setUrlFilter] = useState("");

  const apiKey = getPreferenceValues<Preferences>().apiKey;

  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (url: string) => async (options: { cursor?: string }) => {
      const result = await listHighlights({
        cursor: options.cursor,
        url: url || undefined,
      });
      return {
        data: result.highlights,
        hasMore: result.has_more,
        cursor: result.next_cursor ?? undefined,
      };
    },
    [urlFilter],
    {
      keepPreviousData: true,
      onError: async (error) => {
        const handled = await handleApiError(error);
        if (!handled) {
          await showFailureToast("Failed to load highlights");
        }
      },
    },
  );

  const highlights = data ?? [];

  const availableUrls = useMemo(() => {
    const urls = new Map<string, string>();
    for (const h of highlights) {
      if (h.page_url && !urls.has(h.page_url)) {
        urls.set(h.page_url, h.page_title || h.page_domain);
      }
    }
    return Array.from(urls.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [highlights]);

  // Extract unique page URLs from loaded highlights for the dropdown filter

  const handleDelete = useCallback(
    async (highlightId: string) => {
      const confirmed = await confirmAlert({
        title: "Delete Highlight",
        message: "Delete this highlight? This cannot be undone.",
        primaryAction: {
          title: "Delete",
          style: Action.Style.Destructive as never,
        },
      });
      if (!confirmed) return;
      try {
        await mutate(deleteHighlight(highlightId), {
          optimisticUpdate: (items) =>
            items?.filter((h) => h.id !== highlightId),
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Highlight Deleted",
        });
      } catch (error) {
        const handled = await handleApiError(error);
        if (!handled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to delete highlight",
          });
        }
      }
    },
    [mutate],
  );

  if (!isValidApiKey(apiKey)) {
    return <InvalidKeyView />;
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search highlights..."
      filtering
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Page"
          onChange={(value) => setUrlFilter(value)}
        >
          <List.Dropdown.Item title="All Pages" value="" />
          {availableUrls.length > 0 && (
            <List.Dropdown.Section title="Pages">
              {availableUrls.map(([url, title]) => (
                <List.Dropdown.Item key={url} title={title} value={url} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No Highlights Found"
        description={
          urlFilter
            ? "No highlights for this page"
            : "You haven't saved any highlights yet. Use the Chrome extension or CLI to highlight passages."
        }
        icon={Icon.Highlight}
      />
      {highlights.map((highlight) => (
        <HighlightListItem
          key={highlight.id}
          highlight={highlight}
          onDelete={handleDelete}
        />
      ))}
    </List>
  );
}

// ── List Item ────────────────────────────────────────────────────

function HighlightListItem({
  highlight,
  onDelete,
}: {
  highlight: HighlightWithPage;
  onDelete: (id: string) => Promise<void>;
}) {
  const truncatedText =
    highlight.text.length > 100
      ? highlight.text.slice(0, 100) + "..."
      : highlight.text;

  const accessories: List.Item.Accessory[] = [];
  if (highlight.note) {
    accessories.push({ icon: Icon.Pencil, tooltip: "Has note" });
  }
  accessories.push({
    date: new Date(highlight.created_at),
    tooltip: `Created ${formatDate(highlight.created_at)}`,
  });

  return (
    <List.Item
      id={highlight.id}
      title={truncatedText}
      subtitle={highlight.page_title || highlight.page_domain}
      icon={getPageFavicon(highlight.page_url)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="View">
            <Action.Push
              title="View Highlight"
              icon={Icon.Eye}
              target={
                <HighlightDetailView
                  highlight={highlight}
                  onDelete={onDelete}
                />
              }
            />
            <Action.OpenInBrowser
              title="Open Source Page"
              url={highlight.page_url}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Highlight Text"
              content={highlight.text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Source URL"
              content={highlight.page_url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action
              title="Delete Highlight"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => onDelete(highlight.id)}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ── Detail View ──────────────────────────────────────────────────

function HighlightDetailView({
  highlight,
  onDelete,
}: {
  highlight: HighlightWithPage;
  onDelete: (id: string) => Promise<void>;
}) {
  const markdown = buildHighlightMarkdown(highlight);

  return (
    <Detail
      navigationTitle="Highlight"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Source Page"
            text={highlight.page_title || highlight.page_domain}
          />
          <Detail.Metadata.Link
            title="URL"
            target={highlight.page_url}
            text={highlight.page_domain}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Created"
            text={formatDate(highlight.created_at)}
          />
          {highlight.updated_at && (
            <Detail.Metadata.Label
              title="Updated"
              text={formatDate(highlight.updated_at)}
            />
          )}
          {highlight.tags && (
            <Detail.Metadata.TagList title="Tags">
              {parseTags(highlight.tags).map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open Source Page"
              url={highlight.page_url}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Highlight Text"
              content={highlight.text}
            />
            <Action.CopyToClipboard
              title="Copy Source URL"
              content={highlight.page_url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action
              title="Delete Highlight"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => onDelete(highlight.id)}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function buildHighlightMarkdown(highlight: HighlightWithPage): string {
  let md = `> ${highlight.text}\n`;
  if (highlight.note) {
    md += `\n---\n\n**Note:** ${highlight.note}\n`;
  }
  return md;
}

function parseTags(tagsStr: string): string[] {
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function InvalidKeyView() {
  return (
    <List>
      <List.EmptyView
        title="Invalid API Key"
        description="Your API key must start with 'wsk_'. Open extension preferences to update it."
        icon={Icon.ExclamationMark}
        actions={
          <ActionPanel>
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              onAction={async () => {
                const { openExtensionPreferences } =
                  await import("@raycast/api");
                await openExtensionPreferences();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
