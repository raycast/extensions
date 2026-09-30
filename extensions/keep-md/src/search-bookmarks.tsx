import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  archiveBookmark,
  Bookmark,
  listBookmarks,
  updateBookmark,
} from "./keep";
import { ConnectionDiagnostics } from "./connection-diagnostics";

function EditBookmark({
  item,
  onSaved,
}: {
  item: Bookmark;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(item.title || "");
  const [tags, setTags] = useState(
    (item.tags || item.tagSlugs || []).join(", "),
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }
    setSaving(true);
    try {
      await updateBookmark(item.id, {
        title: title.trim(),
        tags: [
          ...new Set(
            tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        ],
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Bookmark updated",
      });
      onSaved();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update bookmark",
        message: String(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        info="Separate tags with commas."
        value={tags}
        onChange={setTags}
      />
    </Form>
  );
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const currentRequest = useRef(0);
  const canLoadMore = useRef(false);

  const refresh = useCallback(() => {
    canLoadMore.current = false;
    setHasMore(false);
    setLoading(true);
    setOffset(0);
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++currentRequest.current;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError(undefined);
        canLoadMore.current = false;
        try {
          const page = await listBookmarks(query, offset, controller.signal);
          if (requestId !== currentRequest.current) return;
          setItems((previous) =>
            offset === 0 ? page.items : [...previous, ...page.items],
          );
          const more = page.count === page.limit;
          canLoadMore.current = more;
          setHasMore(more);
        } catch (cause) {
          if (controller.signal.aborted || requestId !== currentRequest.current)
            return;
          canLoadMore.current = false;
          setHasMore(false);
          setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
          if (requestId === currentRequest.current) setLoading(false);
        }
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, offset, revision]);

  async function archive(item: Bookmark) {
    const confirmed = await confirmAlert({
      title: "Archive bookmark?",
      message: item.title || item.url || "This item will be archived.",
      primaryAction: { title: "Archive", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await archiveBookmark(item.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Bookmark archived",
      });
      refresh();
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not archive bookmark",
        message: String(cause),
      });
    }
  }

  return (
    <List
      isLoading={loading}
      filtering={false}
      onSearchTextChange={(text) => {
        currentRequest.current += 1;
        canLoadMore.current = false;
        setQuery(text);
        setOffset(0);
        setItems([]);
        setHasMore(false);
        setLoading(true);
      }}
      searchBarPlaceholder="Search Keep.md bookmarks"
      pagination={{
        onLoadMore: () => {
          if (loading || !canLoadMore.current) return;
          canLoadMore.current = false;
          setHasMore(false);
          setOffset((value) => value + 50);
        },
        hasMore: hasMore && !loading,
        pageSize: 50,
      }}
    >
      {error && (
        <List.EmptyView
          title="Could not load bookmarks"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={refresh} />
              <Action.Push
                title="Diagnose Keep Connection"
                target={<ConnectionDiagnostics />}
              />
              <Action
                title="Edit Keep API Key"
                onAction={openExtensionPreferences}
              />
              <Action.OpenInBrowser
                title="Keep API Key Guide"
                url="https://keep.md/docs/api-keys"
              />
            </ActionPanel>
          }
        />
      )}
      {!error && !loading && items.length === 0 && (
        <List.EmptyView
          title="No bookmarks found"
          description="Try another search or save a URL in Keep.md."
        />
      )}
      {!error &&
        items.map((item) => (
          <List.Item
            key={item.id}
            title={item.title || item.url || "Untitled item"}
            subtitle={item.url || undefined}
            accessories={
              item.collectionName ? [{ text: item.collectionName }] : undefined
            }
            icon={Icon.Link}
            actions={
              <ActionPanel>
                {item.url && (
                  <Action.OpenInBrowser
                    url={item.url}
                    title="Open Original URL"
                  />
                )}
                {item.url && (
                  <Action.CopyToClipboard content={item.url} title="Copy URL" />
                )}
                <Action.Push
                  title="Edit Bookmark"
                  icon={Icon.Pencil}
                  target={<EditBookmark item={item} onSaved={refresh} />}
                />
                <Action
                  title="Archive Bookmark"
                  icon={Icon.Tray}
                  onAction={() => archive(item)}
                />
                <Action
                  title="Refresh Bookmarks"
                  icon={Icon.ArrowClockwise}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
