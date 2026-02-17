import { List, ActionPanel, Action, Color, Icon, confirmAlert, Alert, getPreferenceValues } from "@raycast/api";
import { Bookmark } from "./types";

export function EmptyView(props: { title?: string; description?: string; actions?: false | React.JSX.Element }) {
  const { actions, title, description } = props;

  return (
    <List.EmptyView
      title={title || "No Bookmarks Found"}
      description={description || "Add bookmarks to Pinboard and try again."}
      icon="no-view.png"
      actions={actions}
    />
  );
}

function pinboardSearchUrl(title: string): string {
  const { apiToken } = getPreferenceValues<Preferences>();
  const username = apiToken.split(":")[0] ?? "";
  // Strip characters that break Sphinx search (/, \, @, !, etc.)
  const sanitized = title
    .replace(/[/\\@!^~<>{}[\]().:;|&"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `https://pinboard.in/search/u:${username}?query=${encodeURIComponent(sanitized)}`;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

export function BookmarkListItem(props: {
  bookmark: Bookmark;
  onDelete: (bookmark: Bookmark) => Promise<void>;
  showDetail: boolean;
  onToggleDetail: () => void;
}) {
  const { bookmark, onDelete, showDetail, onToggleDetail } = props;

  const accessories: List.Item.Accessory[] = [];
  if (!showDetail) {
    if (bookmark.readLater) {
      accessories.push({ icon: { source: Icon.Book, tintColor: "#c5653f" }, tooltip: "Read Later" });
    }
    if (bookmark.private) {
      accessories.push({ icon: { source: Icon.Lock, tintColor: Color.SecondaryText }, tooltip: "Private" });
    }
    if (bookmark.tags?.length) {
      bookmark.tags.split(" ").forEach((tag) => {
        accessories.push({ tag: { value: tag, color: Color.Orange } });
      });
    }
  }

  const detail = showDetail ? (
    <List.Item.Detail
      markdown={buildDetailMarkdown(bookmark)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Link title="URL" text={bookmark.url} target={bookmark.url} />
          {bookmark.tags && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {bookmark.tags.split(" ").map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} color={Color.Orange} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {bookmark.readLater && <List.Item.Detail.Metadata.Label title="Read Later" icon={Icon.Book} />}
          {bookmark.private && <List.Item.Detail.Metadata.Label title="Private" icon={Icon.Lock} />}
        </List.Item.Detail.Metadata>
      }
    />
  ) : undefined;

  return (
    <List.Item
      id={bookmark.id}
      title={bookmark.title}
      subtitle={getDomain(bookmark.url)}
      icon="list-icon.png"
      accessories={accessories}
      detail={detail}
      actions={<Actions bookmark={bookmark} onDelete={onDelete} onToggleDetail={onToggleDetail} />}
    />
  );
}

function buildDetailMarkdown(bookmark: Bookmark): string {
  if (bookmark.description) {
    return bookmark.description;
  }
  return "*No description*";
}

function Actions({
  bookmark,
  onDelete,
  onToggleDetail,
}: {
  bookmark: Bookmark;
  onDelete: (bookmark: Bookmark) => Promise<void>;
  onToggleDetail: () => void;
}) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={bookmark.url} />
      <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
      <Action.OpenInBrowser
        title="Search on Pinboard"
        url={pinboardSearchUrl(bookmark.title)}
        icon={Icon.MagnifyingGlass}
        shortcut={{ modifiers: ["cmd", "opt"], key: "return" }}
      />
      <Action
        title="Toggle Detail"
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
        onAction={onToggleDetail}
      />
      <Action
        title="Delete Bookmark"
        style={Action.Style.Destructive}
        icon={Icon.Trash}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={async () => {
          if (
            await confirmAlert({
              title: "Delete Bookmark",
              message: "Are you sure you want to delete the bookmark?",
              primaryAction: { title: "Delete Bookmark", style: Alert.ActionStyle.Destructive },
            })
          ) {
            await onDelete(bookmark);
          }
        }}
      />
    </ActionPanel>
  );
}
