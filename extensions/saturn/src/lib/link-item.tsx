import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import {
  SaturnCollection,
  SaturnLink,
  collectionDeepLink,
  domainFromUrl,
  faviconUrl,
  relativeTime,
} from "./saturn";
import { buildDetailMarkdown, SearchResult } from "./search";

interface LinkListItemProps {
  link: SaturnLink;
  collection?: SaturnCollection;
  /** Every link that belongs to the same collection as `link` — powers "Open All Links". */
  collectionLinks?: SaturnLink[];
  /** Ranked-search match info — switches the row into search-result layout. */
  match?: SearchResult;
  /** Records a frecency visit (opening or copying counts as using the link). */
  onVisit?: (link: SaturnLink) => void;
}

async function openAllInCollection(
  links: SaturnLink[],
  collectionName: string,
  onVisit?: (link: SaturnLink) => void,
) {
  await showToast({
    style: Toast.Style.Animated,
    title: `Opening ${links.length} links…`,
  });
  for (const link of links) {
    await open(link.url);
    onVisit?.(link);
  }
  await showToast({
    style: Toast.Style.Success,
    title: `Opened ${links.length} link${links.length === 1 ? "" : "s"}`,
    message: collectionName,
  });
}

/** Stable color per tag string, so the same tag always renders the same pill. */
const TAG_COLORS = [
  Color.Blue,
  Color.Green,
  Color.Orange,
  Color.Purple,
  Color.Red,
  Color.Magenta,
  Color.Yellow,
] as const;

function tagColor(tag: string): Color {
  let hash = 0;
  for (const ch of tag) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) | 0;
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

/**
 * A single row. The detail panel is always on, so the row itself stays
 * minimal: favicon + title at full width, no subtitle, no accessories — the
 * one exception is the greyed "in page" label, shown only on body-only matches
 * (matched page text but NOT title/tags; bucket 1) where a snippet exists to
 * back it. Everything else lives in the detail panel: the markdown body carries
 * just the preview thumbnail plus a one-line bolded snippet, and the metadata
 * block carries tags (colored pills), domain, and saved/opened dates.
 */
export function LinkListItem({
  link,
  collection,
  collectionLinks,
  match,
  onVisit,
}: LinkListItemProps) {
  const domain = domainFromUrl(link.url);
  const bodyOnlyMatch = match?.bucket === 1 && match.snippet;
  const accessories: List.Item.Accessory[] = bodyOnlyMatch
    ? [
        {
          text: { value: "in page", color: Color.SecondaryText },
          tooltip: "Matched in the page text, not the title or tags",
        },
      ]
    : [];

  return (
    <List.Item
      id={link.id}
      icon={{ source: faviconUrl(domain) }}
      title={link.title}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={buildDetailMarkdown(match ?? { link })}
          metadata={
            <List.Item.Detail.Metadata>
              {link.tags && link.tags.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {link.tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={tag}
                      text={tag}
                      color={tagColor(tag)}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Link
                title="Domain"
                text={domain}
                target={link.url}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Saved"
                text={relativeTime(link.capturedAt)}
              />
              <List.Item.Detail.Metadata.Label
                title="Last opened"
                text={
                  link.lastOpenedAt
                    ? relativeTime(link.lastOpenedAt)
                    : "Never opened"
                }
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={link.url} onOpen={() => onVisit?.(link)} />
          <Action.OpenWith
            path={link.url}
            onOpen={() => onVisit?.(link)}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Link"
            content={link.url}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onCopy={() => onVisit?.(link)}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={link.title}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {collectionLinks && collectionLinks.length > 1 && (
            <Action
              title={`Open All ${collectionLinks.length} Links${collection ? ` in ${collection.name}` : ""}`}
              icon={Icon.AppWindowGrid3x3}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              onAction={() =>
                openAllInCollection(
                  collectionLinks,
                  collection?.name ?? "collection",
                  onVisit,
                )
              }
            />
          )}
          {collection && (
            <Action
              title={`Open in Saturn`}
              icon={Icon.AppWindow}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
              onAction={() => open(collectionDeepLink(collection.id))}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
