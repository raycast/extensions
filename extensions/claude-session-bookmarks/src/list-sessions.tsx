import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { getBookmarks, markOpened, removeBookmark, type Bookmark } from "./storage";
import { SessionForm } from "./session-form";

function relativeTime(ts?: number): string | undefined {
  if (!ts) return undefined;
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function Command() {
  const { push } = useNavigation();
  const { data, isLoading, revalidate } = usePromise(getBookmarks, [], {
    onError: (error) => {
      void showFailureToast(error, { title: "Could not load saved sessions" });
    },
  });
  const bookmarks = data ?? [];

  async function openBookmark(bookmark: Bookmark) {
    await open(bookmark.url);
    await markOpened(bookmark.id);
    revalidate();
  }

  async function deleteBookmark(bookmark: Bookmark) {
    const confirmed = await confirmAlert({
      title: `Remove "${bookmark.label}"?`,
      message: "This only removes the saved link from Raycast. The session itself is untouched.",
      icon: Icon.Trash,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeBookmark(bookmark.id);
    await showToast({ style: Toast.Style.Success, title: "Session removed" });
    revalidate();
  }

  const addAction = (
    <Action
      title="Add Session"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => push(<SessionForm onSaved={revalidate} />)}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter saved sessions…">
      <List.EmptyView
        icon={Icon.Bookmark}
        title="No saved sessions"
        description="Add a Claude session link to open it later in one keystroke."
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />
      {bookmarks.map((bookmark) => {
        const opened = relativeTime(bookmark.lastOpenedAt);
        return (
          <List.Item
            key={bookmark.id}
            icon={Icon.Bookmark}
            title={bookmark.label}
            subtitle={bookmark.repo}
            accessories={opened ? [{ text: `opened ${opened}` }] : []}
            keywords={[bookmark.repo ?? "", bookmark.url, bookmark.sessionId ?? ""]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Open in Browser" icon={Icon.Globe} onAction={() => openBookmark(bookmark)} />
                  <Action.CopyToClipboard title="Copy Session URL" content={bookmark.url} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {addAction}
                  <Action
                    title="Edit Session"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() => push(<SessionForm bookmark={bookmark} onSaved={revalidate} />)}
                  />
                  <Action
                    title="Remove Session"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteBookmark(bookmark)}
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
