import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { Highlight, ScreviError, highlightUrl, patch, sourceUrl } from "../lib/screvi";
import {
  formatDate,
  highlightAsMarkdown,
  highlightMarkdown,
  highlightSubtitle,
  sourceIcon,
  SOURCE_TYPE_LABELS,
  tagTint,
  truncate,
} from "../lib/format";

interface Props {
  highlight: Highlight;
  showingDetail: boolean;
  onToggleDetail: () => void;
  /** Present when the list can be updated in place, so favouriting is optimistic. */
  mutate?: MutatePromise<Highlight[]>;
}

/** Search adds relevance fields on top of a highlight; list endpoints do not. */
function isSemanticMatch(highlight: Highlight): boolean {
  return "match_type" in highlight && (highlight as { match_type?: string }).match_type === "semantic";
}

export function HighlightListItem({ highlight, showingDetail, onToggleDetail, mutate }: Props) {
  const source = highlight.source;

  async function toggleFavorite() {
    const next = !highlight.favorite;
    try {
      await mutate?.(patch(`/highlights/${highlight.id}`, { favorite: next }), {
        optimisticUpdate: (items) =>
          items.map((item) => (item.id === highlight.id ? { ...item, favorite: next } : item)),
        rollbackOnError: true,
      });
      await showToast({
        style: Toast.Style.Success,
        title: next ? "Added to favorites" : "Removed from favorites",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update the highlight",
        message:
          error instanceof ScreviError && error.status === 403
            ? "This API key has no write scope. Mint one with write access in Settings > API."
            : error instanceof Error
              ? error.message
              : undefined,
      });
    }
  }

  const accessories: List.Item.Accessory[] = [];
  if (!showingDetail) {
    if (highlight.favorite) {
      accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
    }
    for (const tag of highlight.tags.slice(0, 2)) {
      accessories.push({ tag: { value: tag.name, color: tagTint(tag) } });
    }
    if (isSemanticMatch(highlight)) {
      accessories.push({ icon: Icon.Stars, tooltip: "Semantic match" });
    }
  }

  return (
    <List.Item
      key={highlight.id}
      icon={sourceIcon(source?.type)}
      title={truncate(highlight.content, showingDetail ? 60 : 120)}
      subtitle={showingDetail ? undefined : highlightSubtitle(highlight)}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={highlightMarkdown(highlight)}
          metadata={
            <List.Item.Detail.Metadata>
              {source ? <List.Item.Detail.Metadata.Label title="Source" text={source.name} /> : null}
              {source?.author ? <List.Item.Detail.Metadata.Label title="Author" text={source.author} /> : null}
              {source ? (
                <List.Item.Detail.Metadata.Label
                  title="Type"
                  text={SOURCE_TYPE_LABELS[source.type] ?? source.type}
                  icon={sourceIcon(source.type)}
                />
              ) : null}
              {highlight.tags.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {highlight.tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item key={tag.id} text={tag.name} color={tagTint(tag)} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Highlighted"
                text={formatDate(highlight.date ?? highlight.created_at) ?? "Unknown"}
              />
              {highlight.location !== null ? (
                <List.Item.Detail.Metadata.Label title="Location" text={String(highlight.location)} />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Screvi" url={highlightUrl(highlight.id)} icon={Icon.Highlight} />
            <Action.CopyToClipboard title="Copy Highlight" content={highlight.content} />
            <Action.CopyToClipboard
              title="Copy as Markdown Quote"
              content={highlightAsMarkdown(highlight)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.Paste
              title="Paste Highlight"
              content={highlight.content}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={showingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            {mutate ? (
              <Action
                title={highlight.favorite ? "Remove from Favorites" : "Add to Favorites"}
                icon={highlight.favorite ? Icon.StarDisabled : Icon.Star}
                onAction={toggleFavorite}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {source ? (
              <Action.OpenInBrowser
                title="Open Source in Screvi"
                url={sourceUrl(source.id)}
                icon={sourceIcon(source.type)}
                shortcut={Keyboard.Shortcut.Common.OpenWith}
              />
            ) : null}
            {highlight.url || source?.url ? (
              <Action.OpenInBrowser
                title="Open Original"
                url={(highlight.url ?? source?.url) as string}
                icon={Icon.Globe}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Screvi Link"
              content={highlightUrl(highlight.id)}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
